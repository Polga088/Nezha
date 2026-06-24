import * as React from 'react';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Accent = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';

const ACCENT_ICON: Record<Accent, string> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
  /** Texte secondaire sous la valeur (ex. "vs hier") */
  hint?: string;
  /** Variation en % (positif = vert, négatif = rouge) */
  trend?: number | null;
}

/**
 * Carte KPI bento — valeur très lisible, label secondaire, micro-tendance optionnelle.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  hint,
  trend,
  className,
  ...props
}: MetricCardProps) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend);
  const up = hasTrend && (trend as number) >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-white p-5 shadow-medical ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:shadow-medical-lg hover:ring-slate-900/[0.06]',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
              ACCENT_ICON[accent]
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </span>
        {hasTrend ? (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
              up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}
          >
            {up ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            {Math.abs(trend as number)}%
          </span>
        ) : null}
      </div>

      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
