import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  eyebrow,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-5 border-b border-slate-100/80 pb-7 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-medical-blue-sm">
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="text-label-sm text-blue-600">{eyebrow}</div>
          ) : null}
          <h1 className="text-display-md text-slate-900">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
