'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { UserPlus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

/**
 * Derniers dossiers créés — `GET /api/patients?limit=…` (tri `createdAt` décroissant côté serveur).
 */
export function RecentlyRegistered({ limit = 8, className }: RecentlyRegisteredProps) {
  const { data, isLoading, error } = useSWR<RecentPatientRow[]>(
    `/api/patients?limit=${limit}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  const rows = Array.isArray(data) ? data : [];

  return (
    <Card className={className ?? 'border-0 bg-container-lowest shadow-medical'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-on-surface">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" aria-hidden />
          </span>
          Inscriptions récentes
        </CardTitle>
        <p className="text-sm text-on-surface-variant">
          Derniers dossiers créés (ordre chronologique inverse, ex. saisie accueil).
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Chargement…</p>
        )}
        {error && !isLoading && (
          <p className="py-6 text-center text-sm text-destructive">Impossible de charger les patients.</p>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-on-surface-variant">Aucun patient enregistré.</p>
        )}
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/patients/${p.id}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-container-low/60 px-4 py-3 transition-colors hover:bg-container-low"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold tracking-tight text-on-surface">
                {p.prenom} {p.nom}
              </p>
              <p className="text-xs text-on-surface-variant">
                {format(new Date(p.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary">Voir le dossier →</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
