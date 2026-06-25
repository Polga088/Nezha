import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

import { prisma } from '@/lib/prisma';

export type FinanceExportFilters = {
  from: Date;
  to: Date;
  statut?: 'PENDING' | 'PAID' | 'CANCELLED' | null;
  doctorId?: string | null;
};

function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  let s = String(val);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(',');
}

export async function buildFinanceStatsCsv(filters: FinanceExportFilters): Promise<string> {
  const invoiceWhere: {
    createdAt: { gte: Date; lte: Date };
    statut?: 'PENDING' | 'PAID' | 'CANCELLED';
    appointment?: { doctor_id: string };
  } = {
    createdAt: { gte: filters.from, lte: filters.to },
  };

  if (filters.statut) invoiceWhere.statut = filters.statut;
  if (filters.doctorId) {
    invoiceWhere.appointment = { doctor_id: filters.doctorId };
  }

  const [invoices, expenses, settings] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        patient: { select: { prenom: true, nom: true } },
        appointment: { select: { doctor: { select: { nom: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { date: { gte: filters.from, lte: filters.to } },
      orderBy: { date: 'asc' },
    }),
    prisma.globalSettings.findUnique({
      where: { id: 'default' },
      select: { currency: true },
    }),
  ]);

  const currency = settings?.currency ?? 'EUR';

  const totalBilled = invoices.reduce((s, i) => s + i.montant, 0);
  const totalPaid = invoices.filter((i) => i.statut === 'PAID').reduce((s, i) => s + i.montant, 0);
  const totalPending = invoices.filter((i) => i.statut === 'PENDING').reduce((s, i) => s + i.montant, 0);
  const totalCancelled = invoices.filter((i) => i.statut === 'CANCELLED').reduce((s, i) => s + i.montant, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netEstimate = totalPaid - totalExpenses;

  const byStatus = {
    PAID: invoices.filter((i) => i.statut === 'PAID'),
    PENDING: invoices.filter((i) => i.statut === 'PENDING'),
    CANCELLED: invoices.filter((i) => i.statut === 'CANCELLED'),
  };

  const lines: string[] = [];
  lines.push('Nezha Medical — Export statistiques financières');
  lines.push(
    `Période;${format(filters.from, 'dd/MM/yyyy', { locale: fr })} - ${format(filters.to, 'dd/MM/yyyy', { locale: fr })}`
  );
  lines.push(`Devise;${currency}`);
  lines.push('');
  lines.push('RÉSUMÉ');
  lines.push(row(['Indicateur', 'Valeur']));
  lines.push(row(['Total facturé', totalBilled.toFixed(2)]));
  lines.push(row(['Total encaissé', totalPaid.toFixed(2)]));
  lines.push(row(['Montant en attente', totalPending.toFixed(2)]));
  lines.push(row(['Montant annulé', totalCancelled.toFixed(2)]));
  lines.push(row(['Nombre de factures', invoices.length]));
  lines.push(row(['Dépenses période', totalExpenses.toFixed(2)]));
  lines.push(row(['Bénéfice estimé (encaissé - dépenses)', netEstimate.toFixed(2)]));
  lines.push('');
  lines.push('PAR STATUT');
  lines.push(row(['Statut', 'Nombre', 'Montant']));
  for (const st of ['PAID', 'PENDING', 'CANCELLED'] as const) {
    const list = byStatus[st];
    const amt = list.reduce((s, i) => s + i.montant, 0);
    lines.push(row([st, list.length, amt.toFixed(2)]));
  }
  lines.push('');
  lines.push('DÉTAIL FACTURES');
  lines.push(row(['Date', 'N°', 'Patient', 'Médecin', 'Montant', 'Statut', 'Mode paiement']));
  for (const inv of invoices) {
    lines.push(
      row([
        format(inv.createdAt, 'dd/MM/yyyy', { locale: fr }),
        inv.id.slice(0, 8).toUpperCase(),
        `${inv.patient.prenom} ${inv.patient.nom}`,
        inv.appointment?.doctor?.nom ?? '—',
        inv.montant.toFixed(2),
        inv.statut,
        inv.modePaiement ?? '',
      ])
    );
  }
  lines.push('');
  lines.push('DÉPENSES');
  lines.push(row(['Date', 'Libellé', 'Catégorie', 'Montant']));
  for (const exp of expenses) {
    lines.push(
      row([
        format(exp.date, 'dd/MM/yyyy', { locale: fr }),
        exp.label,
        exp.category,
        exp.amount.toFixed(2),
      ])
    );
  }

  return '\uFEFF' + lines.join('\n');
}

export function parseFinanceExportDates(
  fromRaw: string | null,
  toRaw: string | null
): { from: Date; to: Date } | { error: string } {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = now;

  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to = toRaw ? new Date(toRaw) : defaultTo;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: 'Dates invalides (YYYY-MM-DD)' };
  }
  if (from > to) {
    return { error: 'La date de début doit précéder la date de fin' };
  }

  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  return { from, to: toEnd };
}
