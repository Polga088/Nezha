'use client';

import useSWR from 'swr';

import { LogoutLink } from '@/components/auth/LogoutLink';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

export const DoctorSidebarUserBlock = () => {
  const { data: me } = useSWR<{ nom?: string; role?: string }>(
    '/api/auth/me',
    fetcher
  );

  const label = me?.nom?.trim() || 'Praticien';
  const initial = label.charAt(0).toUpperCase() || 'P';

  return (
    <div className="pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-600"
            aria-hidden
          >
            {initial}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500">Praticien</p>
          </div>
        </div>
        <LogoutLink variant="sidebar" />
      </div>
    </div>
  );
};
