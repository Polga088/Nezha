import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white px-6 py-14 text-center',
        className
      )}
      {...props}
    >
      {Icon ? (
        <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-medical ring-1 ring-slate-900/[0.05]">
          <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </span>
      ) : null}
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
