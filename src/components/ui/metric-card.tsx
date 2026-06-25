import * as React from 'react';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Accent = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';

const ACCENT: Record<
  Accent,
  { card: string; icon: string; value: string; bar: string }
> = {
  blue: {
    card: 'from-blue-50/80 to-white',
    icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-medical-blue-sm',
    value: 'text-blue-600',
    bar: 'bg-gradient-to-r from-blue-500 to-blue-400',
  },
  emerald: {
    card: 'from-emerald-50/80 to-white',
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-medical-blue-sm',
    value: 'text-emerald-600',
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
  },
  amber: {
    card: 'from-amber-50/80 to-white',
    icon: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-medical-blue-sm',
    value: 'text-amber-600',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
  },
  violet: {
    card: 'from-violet-50/80 to-white',
    icon: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-medical-blue-sm',
    value: 'text-violet-600',
    bar: 'bg-gradient-to-r from-violet-500 to-indigo-400',
  },
  rose: {
    card: 'from-rose-50/80 to-white',
    icon: 'bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-medical-blue-sm',
    value: 'text-rose-600',
    bar: 'bg-gradient-to-r from-rose-500 to-red-400',
  },
  slate: {
    card: 'from-slate-50/80 to-white',
    icon: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white',
    value: 'text-slate-700',
    bar: 'bg-gradient-to-r from-slate-400 to-slate-300',
  },
};

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
  hint?: string;
  trend?: number | null;
}

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
  const s = ACCENT[accent];
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend);
  const up = hasTrend && (trend as number) >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-medical ring-1 ring-slate-900/[0.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-medical-lg',
        s.card,
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl', s.icon)}>
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
        ) : (
          <span />
        )}
        <p className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className={cn('text-5xl font-bold tabular-nums tracking-tight', s.value)}>
          {value}
        </span>
        {hasTrend ? (
          <span
            className={cn(
              'mb-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
              up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend as number)}%
          </span>
        ) : null}
      </div>

      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}

      <div className={cn('absolute bottom-0 left-0 right-0 h-1', s.bar)} />
    </div>
  );
}
