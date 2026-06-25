import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface WorkflowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  flush?: boolean;
}

/** Panneau de section workflow clinique — fond blanc, header doux. */
export function WorkflowCard({
  title,
  description,
  icon: Icon,
  actions,
  flush = false,
  className,
  children,
  ...props
}: WorkflowCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_12px_-2px_rgba(23,32,51,0.05)]',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </span>
          ) : null}
          <div>
            <h2 className="text-base font-bold text-[#172033]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={cn(flush ? '' : 'p-6')}>{children}</div>
    </section>
  );
}
