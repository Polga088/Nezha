'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Activity, Heart, Thermometer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getGlycemiaBadgeClassName, getTensionBadgeClassName } from '@/lib/vitals-utils';

export type PatientConsultationRow = {
  id: string;
  patientId: string;
  glycemie: number | null;
  tensionArterielle: string | null;
  battementCoeur: number | null;
  diagnostic: string | null;
  notes: string | null;
  date: string;
};

type Props = {
  /** Données triées par date croissante (API GET) — affichage du plus récent au plus ancien. */
  consultations: PatientConsultationRow[];
  headerAction?: React.ReactNode;
};

export function ConsultationHistory({ consultations, headerAction }: Props) {
  const newestFirst = useMemo(
    () => [...consultations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [consultations]
  )

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Historique — constantes & diagnostics
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ligne de temps des mesures enregistrées pour ce dossier.
          </p>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      {newestFirst.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg bg-slate-50/40">
          <p className="text-sm text-slate-500">
            Aucune entrée. Utilisez « Saisie constantes » pour ajouter glycémie, tension, BPM et
            diagnostic.
          </p>
        </div>
      ) : (
        <ul className="space-y-0" aria-label="Historique des consultations dossier patient">
          {newestFirst.map((c, idx) => (
            <li key={c.id} className="flex gap-3">
              <div className="flex w-5 shrink-0 flex-col items-center pt-1">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-slate-100"
                  aria-hidden
                />
                {idx < newestFirst.length - 1 ? (
                  <span className="mt-1 w-px flex-1 min-h-[1.5rem] bg-slate-200" aria-hidden />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-6">
                <time
                  dateTime={c.date}
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {format(new Date(c.date), 'd MMM yyyy · HH:mm', { locale: fr })}
                </time>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.glycemie != null ? (
                    <Badge
                      variant="outline"
                      className={`gap-1 font-normal ${getGlycemiaBadgeClassName(c.glycemie)}`}
                    >
                      <Thermometer className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                      {c.glycemie} mg/dL
                    </Badge>
                  ) : null}
                  {c.tensionArterielle ? (
                    <Badge
                      variant="outline"
                      className={`gap-1 font-normal ${getTensionBadgeClassName(c.tensionArterielle)}`}
                    >
                      <Activity className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                      {c.tensionArterielle} mmHg
                    </Badge>
                  ) : null}
                  {c.battementCoeur != null ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-rose-200/80 bg-rose-50/90 text-rose-900 font-normal"
                    >
                      <Heart className="h-3 w-3 shrink-0 text-rose-700" aria-hidden />
                      {c.battementCoeur} BPM
                    </Badge>
                  ) : null}
                </div>
                {c.diagnostic ? (
                  <p className="mt-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {c.diagnostic}
                  </p>
                ) : null}
                {c.notes ? (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border-l-2 border-slate-200 pl-3">
                    {c.notes}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
