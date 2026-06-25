import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ClinicalHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

/** Hero clair — Modern Clinical OS (pas de fond navy dominant). */
export function ClinicalHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className,
  children,
  ...props
}: ClinicalHeroProps) {
  return (
    <div
      className={cn(
        'relative mb-8 overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_-4px_rgba(23,32,51,0.08)] sm:p-8',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#2563EB]/5 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-[#06B6D4]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon ? (
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
              <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2563EB]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[1.75rem] font-bold tracking-tight text-[#172033] sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base">
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

/** @deprecated Utiliser ClinicalHero */
export { ClinicalHero as DashboardHero };
