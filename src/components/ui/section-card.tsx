import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Actions à droite de l'en-tête */
  actions?: React.ReactNode;
  /** Retire le padding interne du corps (utile pour tables pleine largeur) */
  flush?: boolean;
  bodyClassName?: string;
}

/**
 * Conteneur de section blanc qui "pop" sur le fond tonal (DESIGN.md §5).
 * En-tête optionnel (icône + titre + actions), corps sans divider lourd.
 */
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
        'overflow-hidden rounded-xl bg-white shadow-medical ring-1 ring-slate-900/[0.04]',
        className
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 space-y-0.5">
              {title ? (
                <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
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
