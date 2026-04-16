import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/** GET /api/chat/unread — nombre de messages non lus (badge) */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const count = await prisma.chatMessage.count({
    where: {
      receiverId: auth.staff.id,
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
