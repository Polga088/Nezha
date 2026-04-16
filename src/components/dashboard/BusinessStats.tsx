'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Banknote, Loader2, Percent, TrendingUp, Users, Wallet } from 'lucide-react';

import type {
  ConsultationsByMonthRow,
  PatientConsultationMix,
  PatientsByAssuranceRow,
} from '@/lib/admin-analytics-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCabinetMoney } from '@/lib/format-cabinet-money';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#db2777',
  '#0d9488',
  '#64748b',
];

type AnalyticsPayload = {
  currency: string;
  kpis: {
    totalPatients: number;
    totalRevenue: number;
    /** Somme des factures PAID créées aujourd’hui (voir route analytics, aggregate Prisma). */
    revenueTodayPaid: number;
    /** Factures réglées sur la période analytique (voir route analytics). */
    totalFactures: number;
    totalExpenses: number;
    /** Total factures réglées − total dépenses (période). */
    beneficeNet: number;
    newPatients: number;
  };
  patientsByAssurance: PatientsByAssuranceRow[];
  consultationsByMonth: ConsultationsByMonthRow[];
  patientConsultationMix: PatientConsultationMix;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error ?? 'Erreur analytique');
  }
  return res.json() as Promise<AnalyticsPayload>;
};

export function BusinessStats() {
  const { data, error, isLoading } = useSWR('/api/admin/analytics?period=30d', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 120_000,
  });

  const pieData = useMemo(() => {
    if (!data?.patientsByAssurance?.length) return [];
    return data.patientsByAssurance
      .filter((r) => r.count > 0)
      .map((r) => ({ name: r.label, value: r.count, key: r.assuranceType }));
  }, [data]);

  const consult6mTotal = useMemo(() => {
    if (!data?.consultationsByMonth?.length) return 0;
    return data.consultationsByMonth.reduce((s, m) => s + m.count, 0);
  }, [data]);

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="pt-6 text-sm text-amber-900">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-8" aria-label="Indicateurs d’activité cabinet">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-800">
          Activité & couverture
        </h2>
        <p className="text-sm font-light text-slate-500">
          Données dossiers et consultations — période glissante 30 jours (hors graphique mensuel).
          Les montants proviennent de la base (Prisma).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <BentoCard
          title="Patients dossiers"
          hint="Total enregistrés (base)"
          icon={Users}
          loading={isLoading}
          value={data ? String(data.kpis.totalPatients) : '—'}
          accent="text-slate-900"
        />
        <BentoCard
          title="Consultations (6 mois)"
          hint="Volume enregistré en dossier"
          icon={Activity}
          loading={isLoading}
          value={isLoading ? '—' : String(consult6mTotal)}
          accent="text-blue-600"
        />
        <BentoCard
          title="Part « nouveaux »"
          hint="Parmi patients vus sur 30 jours (1ère consultation)"
          icon={Percent}
          loading={isLoading}
          value={
            data
              ? `${data.patientConsultationMix.ratioNewPercent} %`
              : '—'
          }
          sub={
            data
              ? `${data.patientConsultationMix.newPatientsActive} nouv. / ${data.patientConsultationMix.returningPatientsActive} suivis`
              : undefined
          }
          accent="text-violet-600"
        />
        <BentoCard
          title="Chiffre d’affaires (jour)"
          hint="Factures réglées (PAID) créées aujourd’hui"
          icon={TrendingUp}
          loading={isLoading}
          value={
            data
              ? formatCabinetMoney(data.kpis.revenueTodayPaid, data.currency)
              : '—'
          }
          accent="text-emerald-600"
        />
        <BentoCard
          title="Total dépenses"
          hint="Somme des dépenses cabinet (période 30 j.)"
          icon={Wallet}
          loading={isLoading}
          value={
            data
              ? formatCabinetMoney(data.kpis.totalExpenses, data.currency)
              : '—'
          }
          accent="text-amber-600"
        />
        <BentoCard
          title="Bénéfice net"
          hint="Factures réglées (période) − dépenses (période)"
          icon={Banknote}
          loading={isLoading}
          value={
            data
              ? formatCabinetMoney(data.kpis.beneficeNet, data.currency)
              : '—'
          }
          accent={
            data && data.kpis.beneficeNet < 0 ? 'text-red-600' : 'text-teal-600'
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Répartition par assurance
            </CardTitle>
            <CardDescription>Nombre de dossiers patients par type de couverture</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Chargement…
              </div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
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
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="tabular-nums text-slate-600">{p.value} dossier(s)</p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Aucun dossier à afficher.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Consultations par mois
            </CardTitle>
            <CardDescription>6 derniers mois (saisies consultation dossier)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pl-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Chargement…
              </div>
            ) : data && data.consultationsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.consultationsByMonth}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const row = payload[0].payload as ConsultationsByMonthRow;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                          <p className="font-medium capitalize text-slate-900">{row.label}</p>
                          <p className="tabular-nums text-blue-600">{row.count} consultation(s)</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Consultations" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Aucune consultation sur la période.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function BentoCard({
  title,
  hint,
  icon: Icon,
  value,
  sub,
  loading,
  accent,
}: {
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  sub?: string;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-800">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'flex min-h-[2rem] items-center text-2xl font-bold tabular-nums tracking-tight',
            accent,
            loading && 'text-slate-200'
          )}
        >
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" aria-hidden />
          ) : (
            value
          )}
        </div>
        {sub && !loading && (
          <p className="mt-1 text-xs font-light text-slate-500">{sub}</p>
        )}
        <p className="mt-1 text-xs font-light text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
