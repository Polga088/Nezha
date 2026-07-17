'use client';

import { Mail, MapPin, Phone } from 'lucide-react';

import type { PublicCabinetBranding } from '@/lib/cabinet-branding';
import { cn } from '@/lib/utils';

type Props = {
  branding: Pick<PublicCabinetBranding, 'phone' | 'email' | 'address' | 'cityLine'>;
  className?: string;
};

const itemClass =
  'group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur-sm transition hover:border-blue-200 hover:bg-white';

const iconClass =
  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-blue-700 transition group-hover:bg-blue-50';

export function PublicContactStrip({ branding, className }: Props) {
  const telHref = `tel:${branding.phone.replace(/\s/g, '')}`;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      <a href={telHref} className={itemClass}>
        <span className={iconClass}>
          <Phone className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Téléphone
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-slate-900">{branding.phone}</span>
        </span>
      </a>

      <a href={`mailto:${branding.email}`} className={itemClass}>
        <span className={iconClass}>
          <Mail className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Email
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-slate-900">{branding.email}</span>
        </span>
      </a>

      <div className={itemClass}>
        <span className={iconClass}>
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Adresse
          </span>
          <span className="mt-1 block text-sm font-semibold text-slate-900">{branding.address}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{branding.cityLine}</span>
        </span>
      </div>
    </div>
  );
}
