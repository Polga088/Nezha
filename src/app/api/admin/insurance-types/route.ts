import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { mapCodeToEnum } from '@/lib/insurance-type';
import { insuranceTypeInputSchema, normalizeInsuranceCode } from '@/lib/insurance-types';

/** GET /api/admin/insurance-types — liste complète (admin). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const rows = await prisma.insuranceType.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { patients: true } } },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      isActive: r.isActive,
      patientCount: r._count.patients,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
}

/** POST /api/admin/insurance-types — créer un type. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = insuranceTypeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(' · ') || 'Données invalides' },
      { status: 400 }
    );
  }

  const code = normalizeInsuranceCode(parsed.data.code);

  try {
    const created = await prisma.insuranceType.create({
      data: {
        name: parsed.data.name,
        code,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        code: created.code,
        description: created.description,
        isActive: created.isActive,
        patientCount: 0,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[POST /api/admin/insurance-types]', e);
    return NextResponse.json({ error: 'Code déjà utilisé ou erreur serveur' }, { status: 409 });
  }
}
