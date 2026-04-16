import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';
import { broadcastUserStatus } from '@/lib/pusher-server';

const STATUSES = ['AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE'] as const;
type StatusValue = (typeof STATUSES)[number];

function isStatus(s: unknown): s is StatusValue {
  return typeof s === 'string' && STATUSES.includes(s as StatusValue);
}

/** Log structuré pour Prisma / erreurs inconnues (terminal). */
function logRouteError(route: string, e: unknown) {
  console.error(`[${route}] erreur:`, e);
  if (e instanceof Error) {
    console.error(`[${route}] name: ${e.name}, message: ${e.message}`);
    if (e.stack) console.error(`[${route}] stack:\n${e.stack}`);
  }
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    if ('code' in o) console.error(`[${route}] Prisma/code:`, o.code);
    if ('meta' in o) console.error(`[${route}] Prisma meta:`, JSON.stringify(o.meta, null, 2));
    if ('clientVersion' in o) console.error(`[${route}] Prisma clientVersion:`, o.clientVersion);
  }
}

/** PATCH /api/users/status — met à jour la disponibilité de l'utilisateur connecté */
export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (!isStatus(body.userStatus)) {
      return NextResponse.json(
        { error: 'userStatus requis : AVAILABLE | BUSY | AWAY | OFFLINE' },
        { status: 400 }
      );
    }

    const now = new Date();

    const user = await prisma.user.update({
      where: { id: auth.staff.id },
      data: {
        userStatus: body.userStatus,
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
