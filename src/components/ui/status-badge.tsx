import * as React from 'react';

import { cn } from '@/lib/utils';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'active';

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-100 text-sky-800 ring-sky-200',
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-800 ring-amber-200',
  danger: 'bg-red-100 text-red-800 ring-red-200',
  active: 'bg-violet-100 text-violet-800 ring-violet-200',
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-slate-500',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  active: 'bg-violet-500',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  label: string;
  dot?: boolean;
  pulse?: boolean;
}

export function StatusBadge({
  tone = 'neutral',
  label,
  dot = true,
  pulse = false,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1',
        TONE_CLASS[tone],
        className
      )}
      {...props}
    >
      {dot ? (
        <span className="relative flex h-2 w-2">
          {pulse ? (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                DOT_CLASS[tone]
              )}
            />
          ) : null}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT_CLASS[tone])} />
        </span>
      ) : null}
      {label}
    </span>
  );
}
