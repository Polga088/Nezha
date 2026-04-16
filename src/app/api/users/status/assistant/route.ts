import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/**
 * GET /api/users/status/assistant — premier membre ASSISTANT actif (visibilité médecin).
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const assistant = await prisma.user.findFirst({
    where: {
      role: 'ASSISTANT',
      isActive: true,
    },
    orderBy: { nom: 'asc' },
    select: {
      id: true,
      nom: true,
      email: true,
      userStatus: true,
      userStatusChangedAt: true,
    },
  });

  if (!assistant) {
    return NextResponse.json({ assistant: null });
  }

  return NextResponse.json({
    assistant: {
      ...assistant,
      userStatusChangedAt: assistant.userStatusChangedAt.toISOString(),
    },
  });
}
