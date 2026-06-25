import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

async function getStaff(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload) return null;
  const role = String(payload.role).toUpperCase();
  if (role !== 'ADMIN' && role !== 'DOCTOR' && role !== 'ASSISTANT') return null;
  return payload;
}

/**
 * GET /api/insurance-types — types actifs pour formulaires (+ type courant si includeId).
 * Query: includeId=uuid pour inclure un type inactif déjà lié à un patient.
 */
export async function GET(request: NextRequest) {
  const user = await getStaff(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const includeId = request.nextUrl.searchParams.get('includeId')?.trim() || null;

  const active = await prisma.insuranceType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      isActive: true,
    },
  });

  if (includeId && !active.some((t) => t.id === includeId)) {
    const extra = await prisma.insuranceType.findUnique({
      where: { id: includeId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
      },
    });
    if (extra) {
      return NextResponse.json({ types: [...active, extra] });
    }
  }

  return NextResponse.json({ types: active });
}
