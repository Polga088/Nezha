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
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  active: 'bg-violet-100 text-violet-700',
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  active: 'bg-violet-500',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  label: string;
  /** Affiche une pastille colorée (info non portée uniquement par la couleur) */
  dot?: boolean;
  /** Animation de pulsation (ex. consultation en cours) */
  pulse?: boolean;
}

/**
 * Chip de statut sobre et cohérent (file d'attente, paiement, RDV…).
 * Le `dot` garantit que l'information n'est pas portée que par la couleur (a11y).
 */
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONE_CLASS[tone],
        className
      )}
      {...props}
    >
      {dot ? (
        <span className="relative flex h-1.5 w-1.5">
          {pulse ? (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                DOT_CLASS[tone]
              )}
            />
          ) : null}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOT_CLASS[tone])} />
        </span>
      ) : null}
      {label}
    </span>
  );
}
