'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Activity } from 'lucide-react';

import { parseTensionMmHg } from '@/lib/vitals-utils';

export type VitalsAnalyticsRow = {
  id: string;
  glycemie: number | null;
  tensionArterielle: string | null;
  battementCoeur: number | null;
  date: string;
};

type ChartPoint = {
  dateLabel: string;
  glycemie: number | null;
  taSys: number | null;
  taDia: number | null;
  bpm: number | null;
};

function buildChartPoints(rows: VitalsAnalyticsRow[]): ChartPoint[] {
  const ordered = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  return ordered.map((c) => {
    const d = new Date(c.date);
    const ta = parseTensionMmHg(c.tensionArterielle);
    return {
      dateLabel: Number.isNaN(d.getTime())
        ? '—'
        : format(d, 'd MMM yy HH:mm', { locale: fr }),
      glycemie: c.glycemie,
      taSys: ta?.systolique ?? null,
      taDia: ta?.diastolique ?? null,
      bpm: c.battementCoeur,
    }
  })
}

type Props = {
  consultations: VitalsAnalyticsRow[];
};

export function VitalsAnalytics({ consultations }: Props) {
  const data = useMemo(() => buildChartPoints(consultations), [consultations])

  const hasAnyNumeric = data.some(
    (p) =>
      p.glycemie != null ||
      p.taSys != null ||
      p.taDia != null ||
      p.bpm != null
  )

  if (!hasAnyNumeric) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
        Aucune mesure numérique à afficher. Ajoutez glycémie, tension ou fréquence pour voir les courbes.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden />
        Suivi des constantes
      </p>
      <div className="h-[min(320px,45vh)] w-full min-h-[240px] rounded-lg border border-slate-100 bg-white/90 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10 }}
              tickMargin={6}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              width={40}
              domain={['auto', 'auto']}
              label={{
                value: 'Valeurs',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: '#64748b' },
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
              formatter={(value: number | string, name: string) => {
                if (value === '' || value == null) return ['—', name]
                if (typeof value === 'number') {
                  return [Number.isFinite(value) ? Math.round(value * 10) / 10 : '—', name]
                }
                return [value, name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="glycemie"
              name="Glycémie (mg/dL)"
              stroke="#d97706"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="taSys"
              name="TA systolique (mmHg)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="taDia"
              name="TA diastolique (mmHg)"
              stroke="#93c5fd"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="bpm"
              name="BPM"
              stroke="#e11d48"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
