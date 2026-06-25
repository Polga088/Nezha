import * as React from 'react';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Accent = 'blue' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'slate';

const ACCENT: Record<Accent, { icon: string; value: string; bar: string }> = {
  blue: {
    icon: 'bg-[#EFF6FF] text-[#2563EB]',
    value: 'text-[#2563EB]',
    bar: 'bg-[#2563EB]',
  },
  emerald: {
    icon: 'bg-[#ECFDF5] text-[#10B981]',
    value: 'text-[#10B981]',
    bar: 'bg-[#10B981]',
  },
  amber: {
    icon: 'bg-[#FFFBEB] text-[#F59E0B]',
    value: 'text-[#F59E0B]',
    bar: 'bg-[#F59E0B]',
  },
  cyan: {
    icon: 'bg-[#ECFEFF] text-[#06B6D4]',
    value: 'text-[#06B6D4]',
    bar: 'bg-[#06B6D4]',
  },
  rose: {
    icon: 'bg-[#FEF2F2] text-[#EF4444]',
    value: 'text-[#EF4444]',
    bar: 'bg-[#EF4444]',
  },
  slate: {
    icon: 'bg-[#F1F5F9] text-[#64748B]',
    value: 'text-[#172033]',
    bar: 'bg-[#94A3B8]',
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
        'relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_2px_12px_-2px_rgba(23,32,51,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(23,32,51,0.1)]',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl', s.icon)}>
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
        ) : (
          <span />
        )}
        <p className="text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
          {label}
        </p>
      </div>

      <p className={cn('mt-4 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl', s.value)}>
        {value}
      </p>

      {hasTrend ? (
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
            up ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend as number)}%
        </span>
      ) : null}

      {hint ? <p className="mt-2 text-xs text-[#64748B]">{hint}</p> : null}

      <div className={cn('absolute bottom-0 left-0 right-0 h-1 opacity-80', s.bar)} />
    </div>
  );
}
