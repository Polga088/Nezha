import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  flush?: boolean;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  flush = false,
  bodyClassName,
  className,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions || Icon);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-medical ring-1 ring-slate-900/[0.04] transition-shadow duration-300 hover:shadow-medical-lg',
        className
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-medical-blue-sm">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 space-y-0.5">
              {title ? (
                <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn(flush ? '' : 'p-5', hasHeader && !flush ? 'pt-4' : '', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
