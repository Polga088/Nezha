import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface DashboardHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  /** Affiche un bandeau gradient derrière le hero */
  gradient?: boolean;
}

/**
 * Hero section premium pour les dashboards — gradient, typographie forte, actions.
 */
export function DashboardHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  gradient = true,
  className,
  children,
  ...props
}: DashboardHeroProps) {
  return (
    <div
      className={cn(
        'relative mb-8 overflow-hidden rounded-3xl p-6 sm:p-8',
        gradient
          ? 'bg-gradient-to-br from-[#0f2744] via-[#1e3a5f] to-[#2563eb] text-white shadow-[0_20px_60px_-12px_rgba(15,39,68,0.5)]'
          : 'bg-white shadow-medical ring-1 ring-slate-900/[0.05]',
        className
      )}
      {...props}
    >
      {gradient ? (
        <>
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-indigo-400/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon ? (
            <span
              className={cn(
                'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1',
                gradient
                  ? 'bg-white/15 text-white ring-white/20 backdrop-blur-sm'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-medical-blue-sm'
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.14em]',
                  gradient ? 'text-blue-200/80' : 'text-blue-600'
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                'text-3xl font-bold tracking-tight sm:text-4xl',
                gradient ? 'text-white' : 'text-slate-900'
              )}
            >
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  'max-w-xl text-sm leading-relaxed sm:text-base',
                  gradient ? 'text-blue-100/75' : 'text-slate-500'
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {children ? <div className="relative z-10 mt-6">{children}</div> : null}
    </div>
  );
}
