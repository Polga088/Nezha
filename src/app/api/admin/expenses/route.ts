import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireAdminOrDoctor } from '@/lib/requireAdmin';

const attachmentUrlSchema = z
  .union([z.string().max(2000), z.null()])
  .optional()
  .refine((v) => v == null || v === '' || v.startsWith('/uploads/expenses/'), {
    message: 'URL de justificatif invalide',
  });

const createExpenseSchema = z.object({
  label: z.string().min(1, 'Libellé requis').max(500),
  amount: z.coerce.number().nonnegative('Montant invalide'),
  category: z.enum(['LOYER', 'MATERIEL', 'SALAIRE', 'AUTRE']),
  date: z.string().optional(),
  attachmentUrl: attachmentUrlSchema,
});

const parseExpenseDate = (input?: string): Date => {
  if (!input?.trim()) return new Date();
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`);
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : new Date();
};

/** GET — liste des dépenses (filtres optionnels : from, to) */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  try {
    const where: { date?: { gte: Date; lte: Date } } = {};
    if (fromStr && toStr) {
      where.date = { gte: new Date(fromStr), lte: new Date(toStr) };
    }

    const rows = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error('[GET /api/admin/expenses]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** POST — créer une dépense */
export async function POST(request: NextRequest) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  try {
    const raw = await request.json();
    const parsed = createExpenseSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      const first = Object.values(msg).flat()[0] ?? 'Données invalides';
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { label, amount, category, date, attachmentUrl } = parsed.data;
    const expenseDate = parseExpenseDate(date);
    const att =
      attachmentUrl?.trim() && attachmentUrl.trim().startsWith('/uploads/expenses/')
        ? attachmentUrl.trim()
        : undefined;

    const row = await prisma.expense.create({
      data: {
        label: label.trim(),
        amount,
        category,
        date: expenseDate,
        ...(att != null && { attachmentUrl: att }),
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error('[POST /api/admin/expenses]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
