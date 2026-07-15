'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Activity, ChevronDown, ChevronRight, Heart, Thermometer } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConsultationForm } from '@/components/patients/ConsultationForm';
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

function hasRenderableText(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  return text !== '' && text !== 'null' && text !== 'undefined';
}

export function hasClinicalContent(consultation: PatientConsultationRow): boolean {
  return (
    hasRenderableText(consultation.motif ?? null) ||
    hasRenderableText(consultation.notes) ||
    hasRenderableText(consultation.diagnostic) ||
    consultation.glycemie != null ||
    hasRenderableText(consultation.tensionArterielle) ||
    consultation.battementCoeur != null
  );
}

type Props = {
  /** Données triées par date croissante (API GET) — affichage du plus récent au plus ancien. */
  consultations: PatientConsultationRow[];
  patientId: string;
  headerAction?: React.ReactNode;
  onConsultationSaved?: () => void | Promise<void>;
  onConsultationUpdated?: (updatedConsultation: PatientConsultationRow) => void | Promise<void>;
};

export function ConsultationHistory({
  consultations,
  patientId,
  headerAction,
  onConsultationSaved,
  onConsultationUpdated,
}: Props) {
  const newestFirst = useMemo(
    () =>
      [...consultations]
        .filter(hasClinicalContent)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [consultations]
  );
  const [visibleCount, setVisibleCount] = useState(5);
  const [openId, setOpenId] = useState<string | null>(newestFirst[0]?.id ?? null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    consultationId: string;
    field: 'notes' | 'diagnostic';
  } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    setVisibleCount(5);
    setOpenId(newestFirst[0]?.id ?? null);
  }, [newestFirst]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setCurrentRole(typeof data?.role === 'string' ? String(data.role).toUpperCase() : null);
        }
      })
      .catch(() => {
        if (!cancelled) setCurrentRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleConsultations = newestFirst.slice(0, visibleCount);
  const hasMore = visibleCount < newestFirst.length;
  const canReduce = visibleCount > 5;

  const sourceLabel = (source?: PatientConsultationRow['source']) =>
    source === 'OUT_OF_APPOINTMENT' ? 'Hors consultation' : 'Consultation';

  const authorLabel = (author?: PatientConsultationRow['author'] | null) =>
    author?.nom ? author.nom : '—';

  const shortText = (value: string | null, maxLength: number) => {
    const compact = hasRenderableText(value) ? value!.trim().replace(/\s+/g, ' ') : '';
    if (!compact) return '—';
    return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()}…` : compact;
  };

  const consultationTypeLabel = (value?: string) => getConsultationTypeLabel(value);
  const canManageConsultations = currentRole === 'DOCTOR' || currentRole === 'ADMIN';

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/consultations/${deleteTarget.consultationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body:
            deleteTarget.field === 'notes'
              ? JSON.stringify({ notes: null })
              : JSON.stringify({ diagnostic: null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Suppression impossible');
        return;
      }
      const updatedConsultation = (data?.consultation ?? data) as PatientConsultationRow | undefined;
      if (updatedConsultation) {
        await onConsultationUpdated?.(updatedConsultation);
      }
      await onConsultationSaved?.();
      toast.success(
        deleteTarget.field === 'notes' ? 'Note supprimée' : 'Diagnostic supprimé'
      );
      setDeleteTarget(null);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletePending(false);
    }
  };

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
                        {hasRenderableText(c.motif ?? null) ? (
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
                        {hasRenderableText(c.tensionArterielle) ? (
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
                      {hasRenderableText(c.diagnostic) ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Diagnostic complet
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {c.diagnostic}
                          </p>
                        </div>
                      ) : null}
                      {hasRenderableText(c.notes) ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Notes complètes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 border-l-2 border-slate-200 pl-3">
                            {c.notes}
                          </p>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {canManageConsultations && c.notes ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget({ consultationId: c.id, field: 'notes' })}
                          >
                            Supprimer la note
                          </Button>
                        ) : null}
                        {canManageConsultations && c.diagnostic ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget({ consultationId: c.id, field: 'diagnostic' })}
                          >
                            Supprimer le diagnostic
                          </Button>
                        ) : null}
                        {canManageConsultations ? (
                          <ConsultationForm
                            patientId={patientId}
                            consultationId={c.id}
                            initialValues={c}
                            onSaved={onConsultationSaved}
                            onConsultationUpdated={onConsultationUpdated}
                            triggerLabel="Modifier"
                            dialogTitle="Modifier la consultation"
                            dialogDescription="Actualisez le type, la date, le motif, les constantes, le diagnostic et les notes."
                            submitLabel="Enregistrer les modifications"
                            submitPendingLabel="Enregistrement…"
                            triggerClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          />
                        ) : null}
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.field === 'notes' ? 'Supprimer la note ?' : 'Supprimer le diagnostic ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.field === 'notes'
                ? 'Confirmez-vous la suppression définitive de cette note médicale ? Cette action est irréversible.'
                : 'Confirmez-vous la suppression définitive de ce diagnostic ? Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deletePending ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
