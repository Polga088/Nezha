import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/** PATCH /api/chat/read — marque comme lus les messages reçus d'un interlocuteur */
export async function PATCH(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const peerId = typeof body.peerId === 'string' ? body.peerId : '';
    if (!peerId) {
      return NextResponse.json({ error: 'peerId requis' }, { status: 400 });
    }

    const now = new Date();
    await prisma.chatMessage.updateMany({
      where: {
        senderId: peerId,
        receiverId: auth.staff.id,
        readAt: null,
      },
      data: { readAt: now },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[chat/read] PATCH', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
