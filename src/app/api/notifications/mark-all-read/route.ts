import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/** POST — tout marquer comme lu. */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: String(user.id), read: false },
      data: { read: true },
    });
    return NextResponse.json({ updated: result.count });
  } catch (e) {
    console.error('[POST /api/notifications/mark-all-read]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
