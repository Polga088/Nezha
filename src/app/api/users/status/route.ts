import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';
import { broadcastUserStatus } from '@/lib/pusher-server';
import { isUserStatus, type UserStatusType } from '@/lib/user-status';

function logRouteError(route: string, e: unknown) {
  console.error(`[${route}] erreur:`, e);
}

/** PATCH /api/users/status — met à jour la disponibilité de l'utilisateur connecté */
export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (!isUserStatus(body.userStatus)) {
      return NextResponse.json(
        {
          error:
            'userStatus requis : AVAILABLE | BUSY | IN_CONSULTATION | ON_BREAK | AWAY | DONE_TODAY | OFFLINE',
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const user = await prisma.user.update({
      where: { id: auth.staff.id },
      data: {
        userStatus: body.userStatus as UserStatusType,
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
