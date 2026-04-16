import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdminOrDoctor } from '@/lib/requireAdmin';

/**
 * GET /api/admin/analytics
 * Totaux bruts (toutes factures payées, toutes dépenses) — sans filtre de dates ni agrégations complexes.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  const [paidInvoices, expenses, settings, totalPatients] = await Promise.all([
    prisma.invoice.findMany({
      where: { statut: 'PAID' },
      select: { montant: true },
    }),
    prisma.expense.findMany({
      select: { amount: true },
    }),
    prisma.globalSettings.findUnique({
      where: { id: 'default' },
      select: { currency: true },
    }),
    prisma.patient.count(),
  ]);

  const totalRevenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.montant), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netRev = totalRevenue - totalExpenses;
  const now = new Date();
  const currency = settings?.currency ?? 'EUR';

  return NextResponse.json({
    period: '30d' as const,
    currency,
    range: {
      from: now.toISOString(),
      to: now.toISOString(),
    },
    kpis: {
      totalRevenue,
      revenueTodayPaid: 0,
      totalFactures: totalRevenue,
      totalExpenses,
      netRevenue: netRev,
      beneficeNet: netRev,
      totalPatients,
      newPatients: 0,
    },
    appointmentsByStatus: {
      completed: 0,
      canceled: 0,
      pending: 0,
    },
    paymentMethods: [] as Array<{
      method: string;
      label: string;
      count: number;
      amount: number;
      percent: number;
    }>,
    dailyRevenue: [] as Array<{
      date: string;
      label: string;
      amount: number;
      expenses: number;
      net: number;
    }>,
    patientsByAssurance: [],
    consultationsByMonth: [],
    patientConsultationMix: {
      newPatientsActive: 0,
      returningPatientsActive: 0,
      ratioNewPercent: 0,
    },
  });
}
