import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { insuranceTypeInputSchema, normalizeInsuranceCode } from '@/lib/insurance-types';

type RouteCtx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/insurance-types/[id] */
export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = insuranceTypeInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(' · ') || 'Données invalides' },
      { status: 400 }
    );
  }

  const data: {
    name?: string;
    code?: string;
    description?: string | null;
    isActive?: boolean;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.code !== undefined) data.code = normalizeInsuranceCode(parsed.data.code);
  if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  try {
    const updated = await prisma.insuranceType.update({
      where: { id },
      data,
      include: { _count: { select: { patients: true } } },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      isActive: updated.isActive,
      patientCount: updated._count.patients,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('[PATCH /api/admin/insurance-types/[id]]', e);
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 409 });
  }
}

/** DELETE /api/admin/insurance-types/[id] — supprime ou désactive si utilisé. */
export async function DELETE(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const row = await prisma.insuranceType.findUnique({
    where: { id },
    include: { _count: { select: { patients: true } } },
  });

  if (!row) {
    return NextResponse.json({ error: 'Type introuvable' }, { status: 404 });
  }

  if (row._count.patients > 0) {
    const deactivated = await prisma.insuranceType.update({
      where: { id },
      data: { isActive: false },
      include: { _count: { select: { patients: true } } },
    });
    return NextResponse.json({
      deactivated: true,
      message: `${row._count.patients} patient(s) utilisent ce type — désactivé au lieu de supprimé.`,
      item: {
        id: deactivated.id,
        name: deactivated.name,
        code: deactivated.code,
        isActive: deactivated.isActive,
        patientCount: deactivated._count.patients,
      },
    });
  }

  await prisma.insuranceType.delete({ where: { id } });
  return NextResponse.json({ deleted: true, message: 'Type d’assurance supprimé.' });
}
