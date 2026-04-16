import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/** GET /api/chat/contacts — collègues (ADMIN / DOCTOR / ASSISTANT) actifs + statut */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: {
      id: { not: auth.staff.id },
      isActive: true,
      role: { in: ['ADMIN', 'DOCTOR', 'ASSISTANT'] },
    },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      userStatus: true,
    },
    orderBy: { nom: 'asc' },
  });

  return NextResponse.json(users);
}
