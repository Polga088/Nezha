import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireAdminOrDoctor } from '@/lib/requireAdmin';

const updateExpenseSchema = z.object({
  label: z.string().min(1).max(500).optional(),
  amount: z.coerce.number().nonnegative().optional(),
  category: z.enum(['LOYER', 'MATERIEL', 'SALAIRE', 'AUTRE']).optional(),
  date: z.string().optional(),
})

const parseExpenseDate = (input?: string): Date => {
  if (!input?.trim()) return new Date();
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`);
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : new Date();
};

/** PUT — mettre à jour une dépense */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0] ?? 'Données invalides';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    const { label, amount, category, date } = parsed.data;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(label != null && { label: label.trim() }),
        ...(amount != null && { amount }),
        ...(category != null && { category }),
        ...(date != null && { date: parseExpenseDate(date) }),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PUT /api/admin/expenses/:id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** DELETE */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  try {
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
  }
}
