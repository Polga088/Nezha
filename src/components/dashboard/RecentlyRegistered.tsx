'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { UserPlus } from 'lucide-react';

import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

export type RecentPatientRow = {
  id: string;
  prenom: string;
  nom: string;
  createdAt: string;
  tel?: string | null;
};

type RecentlyRegisteredProps = {
  limit?: number;
  className?: string;
};

export function RecentlyRegistered({ limit = 8, className }: RecentlyRegisteredProps) {
  const { data, isLoading, error } = useSWR<RecentPatientRow[]>(
    `/api/patients?limit=${limit}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const rows = Array.isArray(data) ? data : [];

  return (
    <SectionCard
      title="Inscriptions récentes"
      description="Derniers dossiers créés à l'accueil."
      icon={UserPlus}
      className={className}
      bodyClassName="space-y-2"
    >
      {isLoading && (
        <p className="py-6 text-center text-sm text-slate-400">Chargement…</p>
      )}
      {error && !isLoading && (
        <p className="py-6 text-center text-sm text-red-500">Impossible de charger les patients.</p>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title="Aucun patient"
          description="Les nouvelles inscriptions apparaîtront ici."
        />
      )}
      {rows.map((p) => (
        <Link
          key={p.id}
          href={`/dashboard/patients/${p.id}`}
          className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-4 py-3.5 ring-1 ring-slate-900/[0.03] transition-all hover:bg-blue-50/50 hover:ring-blue-100"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight text-slate-900">
              {p.prenom} {p.nom}
            </p>
            <p className="text-xs text-slate-500">
              {format(new Date(p.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-blue-600">Voir →</span>
        </Link>
      ))}
    </SectionCard>
  );
}
