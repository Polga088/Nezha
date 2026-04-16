'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
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

export type VitalEntryChart = {
  recordedAt: string;
  poidsKg: number;
};

export type AppointmentForVitals = {
  date_heure: string;
  consultation?: {
    notes_medecin: string | null;
    diagnostic: string | null;
  } | null;
};

export type VitalsChartRow = {
  dateLabel: string;
  poidsKg: number | null;
  tensionSys: number | null;
};

/** Extrait PAS (mmHg) depuis une note type « 130/80 » ou « TA 130/80 ». */
export function parseSystolicFromNotes(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
  if (!m) return null;
  const sys = parseInt(m[1], 10);
  if (sys < 60 || sys > 260) return null;
  return sys;
}

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export function buildVitalsChartRows(
  vitalEntries: VitalEntryChart[],
  appointments: AppointmentForVitals[]
): VitalsChartRow[] {
  type Row = {
    sort: number;
    dateLabel: string;
    poidsKg: number | null;
    tensionSys: number | null;
  };
  const map = new Map<string, Row>();

  for (const v of vitalEntries) {
    const d = new Date(v.recordedAt);
    const k = dayKey(d);
    const prev = map.get(k);
    map.set(k, {
      sort: d.getTime(),
      dateLabel: format(d, 'dd MMM yy', { locale: fr }),
      poidsKg: v.poidsKg,
      tensionSys: prev?.tensionSys ?? null,
    });
  }

  for (const a of appointments) {
    const d = new Date(a.date_heure);
    const k = dayKey(d);
    const notes = a.consultation?.notes_medecin ?? '';
    const diag = a.consultation?.diagnostic ?? '';
    const sys =
      parseSystolicFromNotes(notes) ?? parseSystolicFromNotes(diag);
    const prev = map.get(k);
    if (sys != null) {
      map.set(k, {
        sort: d.getTime(),
        dateLabel: format(d, 'dd MMM yy', { locale: fr }),
        poidsKg: prev?.poidsKg ?? null,
        tensionSys: sys,
      });
    } else if (prev) {
      map.set(k, prev);
    }
  }

  return [...map.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort: _s, ...rest }) => rest);
}

type Props = {
  vitalEntries: VitalEntryChart[];
  appointments: AppointmentForVitals[];
};

/**
 * Courbes Poids (kg) et tension systolique (mmHg) — TA lue dans les notes de consultation (format xxx/yy).
 */
export function VitalsChart({ vitalEntries, appointments }: Props) {
  const data = useMemo(
    () => buildVitalsChartRows(vitalEntries, appointments ?? []),
    [vitalEntries, appointments]
  );

  const hasPoids = data.some((r) => r.poidsKg != null);
  const hasTension = data.some((r) => r.tensionSys != null);

  if (!hasPoids && !hasTension) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
        Pas encore de données pour tracer les courbes : enregistrez des{' '}
        <strong className="text-slate-700">mesures poids/taille</strong> (onglet Évolution) et/ou indiquez une{' '}
        <strong className="text-slate-700">TA (ex. 130/80)</strong> dans les notes de consultation.
      </div>
    );
  }

  return (
    <div className="h-[min(320px,50vh)] w-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickMargin={8} />
          {hasPoids && (
            <YAxis
              yAxisId="poids"
              orientation="left"
              tick={{ fontSize: 11 }}
              width={44}
              domain={['auto', 'auto']}
              label={{
                value: 'kg',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#2563eb' },
              }}
            />
          )}
          {hasTension && (
            <YAxis
              yAxisId="ta"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={48}
              domain={[40, 220]}
              label={{
                value: 'mmHg',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 11, fill: '#dc2626' },
              }}
            />
          )}
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value: number | string, name: string) => {
              if (value === '' || value == null) return ['—', name];
              if (name === 'Poids (kg)') return [`${Number(value).toFixed(1)} kg`, name];
              if (name === 'TA systolique') return [`${value} mmHg`, name];
              return [String(value), name];
            }}
          />
          <Legend />
          {hasPoids && (
            <Line
              yAxisId="poids"
              type="monotone"
              dataKey="poidsKg"
              name="Poids (kg)"
              stroke="#2563eb"
              strokeWidth={2}
              connectNulls
              dot={{ r: 4, fill: '#2563eb' }}
            />
          )}
          {hasTension && (
            <Line
              yAxisId="ta"
              type="monotone"
              dataKey="tensionSys"
              name="TA systolique"
              stroke="#dc2626"
              strokeWidth={2}
              connectNulls
              dot={{ r: 4, fill: '#dc2626' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
