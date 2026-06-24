import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Icône lucide affichée dans une pastille tonale à gauche du titre */
  icon?: LucideIcon;
  /** Actions à droite (boutons, filtres…) */
  actions?: React.ReactNode;
  /** Fil d'ariane ou éléments au-dessus du titre */
  eyebrow?: React.ReactNode;
}

/**
 * En-tête de page unifié (titre + description + actions) — rythme et hiérarchie cohérents
 * sur tous les écrans du dashboard. Respecte la DA « Clinical Architect ».
 */
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
        'flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.7rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
