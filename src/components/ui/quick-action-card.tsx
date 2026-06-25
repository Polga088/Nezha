import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface QuickActionCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: 'blue' | 'cyan' | 'emerald' | 'amber';
  className?: string;
}

const ACCENT = {
  blue: 'bg-[#EFF6FF] text-[#2563EB] group-hover:bg-[#DBEAFE]',
  cyan: 'bg-[#ECFEFF] text-[#06B6D4] group-hover:bg-[#CFFAFE]',
  emerald: 'bg-[#ECFDF5] text-[#10B981] group-hover:bg-[#D1FAE5]',
  amber: 'bg-[#FFFBEB] text-[#F59E0B] group-hover:bg-[#FEF3C7]',
};

export function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  accent = 'blue',
  className,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-start gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_12px_-2px_rgba(23,32,51,0.06)] transition-all hover:border-[#BFDBFE] hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.15)]',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          ACCENT[accent]
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-[#172033]">{title}</p>
        <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>
      </div>
    </Link>
  );
}
