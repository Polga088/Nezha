import * as React from 'react';

import { cn } from '@/lib/utils';

export interface DashboardSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Grille bento pour les enfants */
  bento?: boolean;
}

/**
 * Section de dashboard avec titre, description et grille bento optionnelle.
 */
export function DashboardSection({
  title,
  description,
  actions,
  bento = false,
  className,
  children,
  ...props
}: DashboardSectionProps) {
  return (
    <section className={cn('space-y-5', className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}
      <div className={cn(bento && 'bento-grid')}>{children}</div>
    </section>
  );
}
