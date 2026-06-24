import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Bouton / lien d'action principal */
  action?: React.ReactNode;
}

/**
 * État vide unifié — centré, calme, avec icône tonale. Utilisé pour les listes/tables vides.
 */
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
        'flex flex-col items-center justify-center rounded-xl bg-slate-50/60 px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      {Icon ? (
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-medical-sm ring-1 ring-slate-900/[0.04]">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
