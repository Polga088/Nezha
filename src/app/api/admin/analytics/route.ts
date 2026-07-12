import { NextRequest, NextResponse } from 'next/server';
import { eachDayOfInterval, endOfDay, format, startOfDay, startOfYear, subDays } from 'date-fns';

import { prisma } from '@/lib/prisma';
import { requireAdminOrDoctor } from '@/lib/requireAdmin';
import type { AssuranceType, InvoiceModePaiement, Prisma } from '@/generated/prisma/client';

type Period = '7d' | '30d' | 'year' | 'custom';

const PAYMENT_METHOD_LABELS: Record<InvoiceModePaiement, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  CHECK: 'Chèque',
};

const ASSURANCE_LABELS: Record<AssuranceType, string> = {
  AUCUNE: 'Aucune',
  CNSS: 'CNSS',
  CNOPS: 'CNOPS',
  FAR: 'FAR',
  RAMID: 'RAMID',
  MUTUELLE_PRIVEE: 'Mutuelle privée',
  AUTRE: 'Autre',
};

function parseRange(request: NextRequest): { period: Period; from: Date; to: Date } {
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');

  if (fromRaw && toRaw) {
    const from = startOfDay(new Date(fromRaw));
    const to = endOfDay(new Date(toRaw));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { period: 'custom', from, to };
    }
  }

  const now = new Date();
  const periodRaw = searchParams.get('period');
  if (periodRaw === '7d') {
    return { period: '7d', from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }
  if (periodRaw === 'year') {
    return { period: 'year', from: startOfYear(now), to: endOfDay(now) };
  }
  return { period: '30d', from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
}

function paidInvoiceWhere(from: Date, to: Date): Prisma.InvoiceWhereInput {
  return {
    statut: 'PAID',
    OR: [
      { datePaiement: { gte: from, lte: to } },
      { datePaiement: null, createdAt: { gte: from, lte: to } },
    ],
  };
}

function invoicePaidAt(invoice: { datePaiement: Date | null; createdAt: Date }): Date {
  return invoice.datePaiement ?? invoice.createdAt;
}

/**
 * GET /api/admin/analytics
 * Revenus et RDV réglés suivent la même règle métier :
 * une facture `PAID` confirme le paiement, et son RDV lié est compté comme réglé sur la même période.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDoctor(request);
  if (!auth.ok) return auth.response;

  const { period, from, to } = parseRange(request);
  const paidWhere = paidInvoiceWhere(from, to);
  const today = new Date();
  const todayPaidWhere = paidInvoiceWhere(startOfDay(today), endOfDay(today));

  const [
    paidInvoices,
    expenses,
    settings,
    totalPatients,
    newPatients,
    canceledAppointments,
    pendingAppointments,
    patientsByAssuranceRaw,
    consultationsByMonthRaw,
    activePatientRows,
    firstConsultationRows,
    revenueTodayAgg,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: paidWhere,
      select: {
        montant: true,
        modePaiement: true,
        createdAt: true,
        datePaiement: true,
        appointmentId: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { amount: true, date: true },
    }),
    prisma.globalSettings.findUnique({
      where: { id: 'default' },
      select: { currency: true },
    }),
    prisma.patient.count(),
    prisma.patient.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.appointment.count({
      where: { statut: 'CANCELED', date_heure: { gte: from, lte: to } },
    }),
    prisma.appointment.count({
      where: {
        statut: { in: ['WAITING', 'IN_PROGRESS', 'FINISHED'] },
        date_heure: { gte: from, lte: to },
      },
    }),
    prisma.patient.groupBy({
      by: ['assuranceType'],
      _count: { _all: true },
    }),
    prisma.consultation.groupBy({
      by: ['date'],
      where: { date: { gte: subDays(to, 183), lte: to } },
      _count: { _all: true },
    }),
    prisma.consultation.findMany({
      where: { date: { gte: from, lte: to } },
      distinct: ['patientId'],
      select: { patientId: true },
    }),
    prisma.consultation.groupBy({
      by: ['patientId'],
      _min: { date: true },
    }),
    prisma.invoice.aggregate({
      where: todayPaidWhere,
      _sum: { montant: true },
    }),
  ]);

  const totalRevenue = paidInvoices.reduce((acc, inv) => acc + Number(inv.montant), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const netRev = totalRevenue - totalExpenses;
  const currency = settings?.currency ?? 'EUR';
  const paidAppointmentCount = new Set(
    paidInvoices.map((invoice) => invoice.appointmentId).filter(Boolean)
  ).size;

  const paymentTotalCount = paidInvoices.length || 1;
  const paymentMethods = Object.entries(
    paidInvoices.reduce(
      (acc, invoice) => {
        const key = invoice.modePaiement;
        acc[key] = acc[key] ?? { count: 0, amount: 0 };
        acc[key].count += 1;
        acc[key].amount += Number(invoice.montant);
        return acc;
      },
      {} as Record<InvoiceModePaiement, { count: number; amount: number }>
    )
  ).map(([method, row]) => ({
    method,
    label: PAYMENT_METHOD_LABELS[method as InvoiceModePaiement] ?? method,
    count: row.count,
    amount: row.amount,
    percent: Math.round((row.count / paymentTotalCount) * 100),
  }));

  const revenueByDay = new Map<string, number>();
  for (const invoice of paidInvoices) {
    const key = format(invoicePaidAt(invoice), 'yyyy-MM-dd');
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(invoice.montant));
  }

  const expensesByDay = new Map<string, number>();
  for (const expense of expenses) {
    const key = format(expense.date, 'yyyy-MM-dd');
    expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + Number(expense.amount));
  }

  const dailyRevenue = eachDayOfInterval({ start: from, end: to }).map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const amount = revenueByDay.get(key) ?? 0;
    const dayExpenses = expensesByDay.get(key) ?? 0;
    return {
      date: key,
      label: format(day, 'dd/MM'),
      amount,
      expenses: dayExpenses,
      net: amount - dayExpenses,
    };
  });

  const patientsByAssurance = patientsByAssuranceRaw.map((row) => ({
    assuranceType: row.assuranceType,
    label: ASSURANCE_LABELS[row.assuranceType] ?? row.assuranceType,
    count: row._count._all,
  }));

  const consultationMonthCounts = new Map<string, number>();
  for (const row of consultationsByMonthRaw) {
    const monthKey = format(row.date, 'yyyy-MM');
    consultationMonthCounts.set(monthKey, (consultationMonthCounts.get(monthKey) ?? 0) + row._count._all);
  }
  const consultationsByMonth = Array.from(consultationMonthCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, count]) => ({
      monthKey,
      label: format(new Date(`${monthKey}-01T00:00:00.000Z`), 'MM/yyyy'),
      count,
    }));

  const activePatientIds = new Set(activePatientRows.map((row) => row.patientId));
  const firstConsultationByPatient = new Map(
    firstConsultationRows.map((row) => [row.patientId, row._min.date])
  );
  let newPatientsActive = 0;
  for (const patientId of activePatientIds) {
    const first = firstConsultationByPatient.get(patientId);
    if (first && first >= from && first <= to) newPatientsActive += 1;
  }
  const returningPatientsActive = Math.max(activePatientIds.size - newPatientsActive, 0);
  const ratioNewPercent =
    activePatientIds.size > 0 ? Math.round((newPatientsActive / activePatientIds.size) * 100) : 0;

  return NextResponse.json({
    period,
    currency,
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    kpis: {
      totalRevenue,
      revenueTodayPaid: Number(revenueTodayAgg._sum.montant ?? 0),
      totalFactures: paidInvoices.length,
      totalExpenses,
      netRevenue: netRev,
      beneficeNet: netRev,
      totalPatients,
      newPatients,
    },
    appointmentsByStatus: {
      completed: paidAppointmentCount,
      canceled: canceledAppointments,
      pending: pendingAppointments,
    },
    paymentMethods,
    dailyRevenue,
    patientsByAssurance,
    consultationsByMonth,
    patientConsultationMix: {
      newPatientsActive,
      returningPatientsActive,
      ratioNewPercent,
    },
  });
}
