import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}

const patchSchema = z.object({
  read: z.boolean(),
});

/** PATCH — marquer une notification lue / non lue. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const userId = String(user.id);

  try {
    const raw = await request.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
    }

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Notification introuvable' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: parsed.data.read },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PATCH /api/notifications/:id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
