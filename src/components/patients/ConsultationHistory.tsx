'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Activity, ChevronDown, ChevronRight, Heart, Thermometer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getGlycemiaBadgeClassName, getTensionBadgeClassName } from '@/lib/vitals-utils';
import { getConsultationTypeLabel } from '@/lib/consultation-types';

export type PatientConsultationRow = {
  id: string;
  patientId: string;
  type?: string;
  motif?: string | null;
  glycemie: number | null;
  tensionArterielle: string | null;
  battementCoeur: number | null;
  diagnostic: string | null;
  notes: string | null;
  source?: 'MANUAL' | 'OUT_OF_APPOINTMENT';
  author?: { id: string; nom: string; role: string } | null;
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
  );
  const [visibleCount, setVisibleCount] = useState(5);
  const [openId, setOpenId] = useState<string | null>(newestFirst[0]?.id ?? null);

  useEffect(() => {
    setVisibleCount(5);
    setOpenId(newestFirst[0]?.id ?? null);
  }, [newestFirst]);

  const visibleConsultations = newestFirst.slice(0, visibleCount);
  const hasMore = visibleCount < newestFirst.length;
  const canReduce = visibleCount > 5;

  const sourceLabel = (source?: PatientConsultationRow['source']) =>
    source === 'OUT_OF_APPOINTMENT' ? 'Hors consultation' : 'Consultation';

  const authorLabel = (author?: PatientConsultationRow['author'] | null) =>
    author?.nom ? author.nom : '—';

  const shortText = (value: string | null, maxLength: number) => {
    if (!value) return '—';
    const compact = value.replace(/\s+/g, ' ').trim();
    return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()}…` : compact;
  };

  const consultationTypeLabel = (value?: string) => getConsultationTypeLabel(value);

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
            Aucune entrée. Utilisez « Saisie constantes » pour ajouter une consultation.
          </p>
        </div>
      ) : (
        <div className="space-y-3" aria-label="Historique des consultations dossier patient">
          <ul className="space-y-3">
            {visibleConsultations.map((c) => {
              const isOpen = openId === c.id;
              return (
                <li key={c.id} className="rounded-xl border border-slate-200/80 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                  >
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <time
                          dateTime={c.date}
                          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {format(new Date(c.date), 'd MMM yyyy · HH:mm', { locale: fr })}
                        </time>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                          {consultationTypeLabel(c.type)}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                          {sourceLabel(c.source)}
                        </Badge>
                        <span className="text-xs text-slate-500">Auteur : {authorLabel(c.author)}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-slate-800 line-clamp-2">
                          <span className="font-medium text-slate-600">Motif : </span>
                          {shortText(c.motif ?? null, 120)}
                        </p>
                        <p className="text-sm text-slate-800 line-clamp-2">
                          <span className="font-medium text-slate-600">Notes : </span>
                          {shortText(c.notes, 160)}
                        </p>
                        <p className="text-sm text-slate-700 line-clamp-1">
                          <span className="font-medium text-slate-600">Diagnostic : </span>
                          {shortText(c.diagnostic, 90)}
                        </p>
                      </div>
                      {!isOpen ? (
                        <p className="mt-2 text-xs font-medium text-blue-600">Voir les détails</p>
                      ) : null}
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                      <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type / source</p>
                          <p className="mt-1">
                            {consultationTypeLabel(c.type)} — {sourceLabel(c.source)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auteur</p>
                          <p className="mt-1">{authorLabel(c.author)}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                          <p className="mt-1">{format(new Date(c.date), 'd MMM yyyy · HH:mm', { locale: fr })}</p>
                        </div>
                        {c.motif ? (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motif</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                              {c.motif}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
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
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Diagnostic complet
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {c.diagnostic}
                          </p>
                        </div>
                      ) : null}
                      {c.notes ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Notes complètes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 border-l-2 border-slate-200 pl-3">
                            {c.notes}
                          </p>
                        </div>
                      ) : null}
                      <div className="mt-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpenId(null)}>
                          Masquer les détails
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {canReduce ? (
              <Button type="button" variant="outline" onClick={() => setVisibleCount(5)}>
                Réduire
              </Button>
            ) : null}
            {hasMore ? (
              <Button type="button" variant="outline" onClick={() => setVisibleCount((value) => value + 5)}>
                Afficher plus
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
