import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/** GET /api/prescription-templates — packs favoris (éditeur) */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const templates = await prisma.prescriptionTemplate.findMany({
    orderBy: { titre: 'asc' },
    select: {
      id: true,
      titre: true,
      contenu: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(templates);
}
