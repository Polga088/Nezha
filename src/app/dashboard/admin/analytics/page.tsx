'use client';

import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import useSWR from 'swr';
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarX,
  Clock,
  TrendingUp,
  Users,
  UserPlus,
  Wallet,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCabinetMoney } from '@/lib/format-cabinet-money';
import { cn } from '@/lib/utils';

import type {
  ConsultationsByMonthRow,
  PatientConsultationMix,
  PatientsByAssuranceRow,
} from '@/lib/admin-analytics-types';

type Period = '7d' | '30d' | 'year';

export type AnalyticsResponse = {
  period: Period | 'custom';
  currency: string;
  range: { from: string; to: string };
  kpis: {
    totalRevenue: number;
    revenueTodayPaid: number;
    totalFactures: number;
    totalExpenses: number;
    netRevenue: number;
    beneficeNet: number;
    totalPatients: number;
    newPatients: number;
  };
  appointmentsByStatus: {
    completed: number;
    canceled: number;
    pending: number;
  };
  paymentMethods: Array<{
    method: string;
    label: string;
    count: number;
    amount: number;
    percent: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    label: string;
    amount: number;
    expenses: number;
    net: number;
  }>;
  patientsByAssurance: PatientsByAssuranceRow[];
  consultationsByMonth: ConsultationsByMonthRow[];
  patientConsultationMix: PatientConsultationMix;
};

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#64748b'];

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error ?? 'Erreur de chargement');
  }
  return res.json() as Promise<AnalyticsResponse>;
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeActive, setRangeActive] = useState(false);

  const analyticsUrl = useMemo(() => {
    if (rangeActive && rangeFrom && rangeTo) {
      return `/api/admin/analytics?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}`;
    }
    return `/api/admin/analytics?period=${period}`;
  }, [period, rangeActive, rangeFrom, rangeTo]);

  const { data, error, isLoading } = useSWR<AnalyticsResponse>(analyticsUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const pieData = useMemo(() => {
    if (!data?.paymentMethods?.length) return [];
    return data.paymentMethods.map((p) => ({
      name: p.label,
      value: p.count,
      amount: p.amount,
      percent: p.percent,
    }));
  }, [data]);

  const periodLabel = useMemo(() => {
    if (rangeActive && data?.range?.from && data?.range?.to) {
      return `${format(new Date(data.range.from), 'd MMM yyyy', { locale: fr })} — ${format(
        new Date(data.range.to),
        'd MMM yyyy',
        { locale: fr }
      )}`;
    }
    return period === '7d' ? '7 jours' : period === '30d' ? '30 jours' : 'Année en cours';
  }, [rangeActive, data, period]);

  return (
    <div className="w-full min-w-0 space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Rapports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Indicateurs clés et tendances — période : {periodLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">Période</span>
            <Select
              value={period}
              onValueChange={(v) => {
                setPeriod(v as Period);
                setRangeActive(false);
              }}
            >
              <SelectTrigger className="w-[200px] border-slate-200 bg-white shadow-sm">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="year">Année en cours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border-0 bg-slate-50/90 px-3 py-3 shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Du</Label>
              <Input
                type="date"
                className="h-9 w-[150px] bg-white"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Au</Label>
              <Input
                type="date"
                className="h-9 w-[150px] bg-white"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!rangeFrom || !rangeTo}
              onClick={() => setRangeActive(true)}
            >
              Appliquer plage
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setRangeActive(false);
                setRangeFrom('');
                setRangeTo('');
              }}
            >
              Réinitialiser
            </Button>
            <div className="flex gap-1 w-full sm:w-auto sm:pl-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  const d = new Date();
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setRangeFrom(`${y}-${m}-${day}`);
                  setRangeTo(`${y}-${m}-${day}`);
                  setRangeActive(true);
                }}
              >
                Aujourd&apos;hui
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  const from = startOfMonth(new Date());
                  const to = endOfMonth(new Date());
                  setRangeFrom(format(from, 'yyyy-MM-dd'));
                  setRangeTo(format(to, 'yyyy-MM-dd'));
                  setRangeActive(true);
                }}
              >
                Ce mois
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Card className="rounded-2xl border border-red-200/80 bg-red-50/50 shadow-sm">
          <CardContent className="pt-6 text-sm text-red-800">{error.message}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        <KpiCard
          title="Revenus"
          description={`CA facturé (${periodLabel})`}
          icon={Banknote}
          loading={isLoading}
          value={data ? formatCabinetMoney(data.kpis.totalRevenue, data.currency) : '—'}
          accent="text-blue-600"
        />
        <KpiCard
          title="Dépenses"
          description={`Charges (${periodLabel})`}
          icon={Wallet}
          loading={isLoading}
          value={data ? formatCabinetMoney(data.kpis.totalExpenses, data.currency) : '—'}
          accent="text-amber-600"
        />
        <KpiCard
          title="Résultat net"
          description="Revenus − dépenses"
          icon={TrendingUp}
          loading={isLoading}
          value={data ? formatCabinetMoney(data.kpis.netRevenue, data.currency) : '—'}
          accent="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
        <KpiCard
          title="Total patients"
          description="Dossiers enregistrés"
          icon={Users}
          loading={isLoading}
          value={data ? String(data.kpis.totalPatients) : '—'}
          accent="text-slate-900 dark:text-zinc-100"
        />
        <KpiCard
          title="Nouveaux patients"
          description={`Inscriptions (${periodLabel})`}
          icon={UserPlus}
          loading={isLoading}
          value={data ? String(data.kpis.newPatients) : '—'}
          accent="text-violet-600"
        />
      </div>

      {data && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Rendez-vous par statut
            </CardTitle>
            <CardDescription>
              Comptage sur la période sélectionnée (selon la date du rendez-vous)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatusMini
                icon={CalendarCheck}
                label="Réglés"
                value={data.appointmentsByStatus.completed}
                className="border-emerald-100 bg-emerald-50/60"
                iconClass="text-emerald-600"
              />
              <StatusMini
                icon={CalendarX}
                label="Annulé"
                value={data.appointmentsByStatus.canceled}
                className="border-red-100 bg-red-50/50"
                iconClass="text-red-600"
              />
              <StatusMini
                icon={Clock}
                label="En attente"
                value={data.appointmentsByStatus.pending}
                className="border-amber-100 bg-amber-50/50"
                iconClass="text-amber-600"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-white shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Évolution du CA (journalier)</CardTitle>
            <CardDescription>
              CA facturé, dépenses et résultat net par jour sur la période
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] w-full pl-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Chargement…
              </div>
            ) : data && data.dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.dailyRevenue} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97706" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(Number(v))
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as AnalyticsResponse['dailyRevenue'][0];
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 px-3 py-2 shadow-md text-sm">
                          <p className="font-medium text-slate-900 dark:text-zinc-100">{row.date}</p>
                          <p className="text-blue-600 tabular-nums">
                            CA : {formatCabinetMoney(row.amount, data.currency)}
                          </p>
                          <p className="text-amber-700 tabular-nums dark:text-amber-400">
                            Dépenses : {formatCabinetMoney(row.expenses, data.currency)}
                          </p>
                          <p className="text-emerald-600 tabular-nums font-medium">
                            Net : {formatCabinetMoney(row.net, data.currency)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="CA"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#caFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Dépenses"
                    stroke="#d97706"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#expFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Aucune donnée de facturation sur cette période.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Modes de paiement</CardTitle>
            <CardDescription>Répartition par nombre de factures</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Chargement…
              </div>
            ) : pieData.length > 0 && data ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const p = payload[0].payload as (typeof pieData)[0];
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm max-w-[220px]">
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="text-slate-600">
                            {p.value} facture{p.value > 1 ? 's' : ''} ({p.percent} %)
                          </p>
                          <p className="text-blue-600 tabular-nums">
                            {formatCabinetMoney(p.amount, data.currency)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 px-4 text-center">
                Aucune facture sur cette période — la répartition apparaîtra ici.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  description,
  icon: Icon,
  value,
  loading,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold tabular-nums',
            accent,
            loading && 'animate-pulse text-slate-300'
          )}
        >
          {loading ? '…' : value}
        </div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusMini({
  icon: Icon,
  label,
  value,
  className,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  className?: string;
  iconClass?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', iconClass)} />
      <div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
      </div>
    </div>
  );
}
