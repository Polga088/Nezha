import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';
import { triggerNewMessage } from '@/lib/pusher-server';

/** GET /api/chat/messages?peerId= — fil de discussion avec un collègue */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const peerId = request.nextUrl.searchParams.get('peerId');
  if (!peerId) {
    return NextResponse.json({ error: 'peerId requis' }, { status: 400 });
  }

  const peer = await prisma.user.findFirst({
    where: {
      id: peerId,
      isActive: true,
      role: { in: ['ADMIN', 'DOCTOR', 'ASSISTANT'] },
    },
    select: { id: true },
  });
  if (!peer) {
    return NextResponse.json({ error: 'Interlocuteur introuvable' }, { status: 404 });
  }

  const me = auth.staff.id;
  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: peerId },
        { senderId: peerId, receiverId: me },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      readAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(messages);
}

/** POST /api/chat/messages — envoyer un message */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const receiverId = typeof body.receiverId === 'string' ? body.receiverId : '';
    const content =
      typeof body.content === 'string' ? body.content.trim() : '';

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'receiverId et content requis' },
        { status: 400 }
      );
    }
    if (receiverId === auth.staff.id) {
      return NextResponse.json({ error: 'Destinataire invalide' }, { status: 400 });
    }

    const receiver = await prisma.user.findFirst({
      where: {
        id: receiverId,
        isActive: true,
        role: { in: ['ADMIN', 'DOCTOR', 'ASSISTANT'] },
      },
    });
    if (!receiver) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        content,
        senderId: auth.staff.id,
        receiverId,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        readAt: true,
        createdAt: true,
      },
    });

    await triggerNewMessage(receiverId, {
      message: {
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      },
      senderId: auth.staff.id,
    });

    return NextResponse.json({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('[chat/messages] POST', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
