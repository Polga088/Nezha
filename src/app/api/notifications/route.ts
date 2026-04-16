import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/** GET — liste des notifications de l’utilisateur (récentes en premier). */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 30));

  try {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: String(user.id) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: String(user.id), read: false },
      }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (e) {
    console.error('[GET /api/notifications]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
