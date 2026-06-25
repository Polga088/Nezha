import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface DataTableShellProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Conteneur premium pour tables de données — toolbar, header doux, overflow responsive.
 */
export function DataTableShell({
  title,
  description,
  icon: Icon,
  toolbar,
  footer,
  className,
  children,
  ...props
}: DataTableShellProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-medical ring-1 ring-slate-900/[0.04]',
        className
      )}
      {...props}
    >
      {(title || toolbar) && (
        <div className="border-b border-slate-100/80 bg-gradient-to-b from-slate-50/80 to-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {(title || description) && (
              <div className="flex min-w-0 items-start gap-3">
                {Icon ? (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                ) : null}
                <div className="min-w-0">
                  {title ? (
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
                  ) : null}
                  {description ? (
                    <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                  ) : null}
                </div>
              </div>
            )}
            {toolbar ? (
              <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
            ) : null}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer ? (
        <div className="border-t border-slate-100/80 bg-slate-50/50 px-5 py-3 text-sm text-slate-500">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
