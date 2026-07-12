import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUserStatus } from '@/lib/pusher-server';
import { verifyJwt } from '@/lib/auth';
import { normalizeUserStatusInput } from '@/lib/user-status';

function logRouteError(route: string, e: unknown) {
  console.error(`[${route}] erreur:`, e);
}

/** PATCH /api/users/status — met à jour la disponibilité de l'utilisateur connecté */
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const payload = await verifyJwt(token);
  if (!payload?.id) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }

  const staff = await prisma.user.findUnique({
    where: { id: String(payload.id) },
    select: {
      id: true,
      email: true,
      nom: true,
      role: true,
      isActive: true,
    },
  });

  if (!staff || !staff.isActive) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const role = String(staff.role).toUpperCase();
  if (role !== 'ADMIN' && role !== 'DOCTOR' && role !== 'ASSISTANT') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const requestedStatus = normalizeUserStatusInput(body.userStatus);
    if (!requestedStatus) {
      return NextResponse.json(
        {
          error:
            'userStatus requis : AVAILABLE | BUSY | IN_CONSULTATION | ON_BREAK | ABSENT | AWAY | DONE_TODAY | OFFLINE',
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const user = await prisma.user.update({
      where: { id: staff.id },
      data: {
        userStatus: requestedStatus,
        userStatusChangedAt: now,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        userStatus: true,
        userStatusChangedAt: true,
      },
    });

    try {
      await broadcastUserStatus({
        userId: user.id,
        userStatus: user.userStatus,
        userStatusChangedAt: user.userStatusChangedAt.toISOString(),
      });
    } catch (broadcastErr) {
      console.error(
        '[users/status] broadcast Pusher échoué (statut déjà enregistré en base):',
        broadcastErr
      );
    }

    return NextResponse.json({
      ...user,
      userStatusChangedAt: user.userStatusChangedAt.toISOString(),
    });
  } catch (e) {
    logRouteError('users/status PATCH', e);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}
