'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoiceDictation } from '@/components/patients/VoiceDictation';
import { cn } from '@/lib/utils';

export type ConsultationEditorProps = {
  /** Patient cible pour les notes hors rendez-vous. */
  patientId: string;
  /** RDV cible (dernier RDV du patient, etc.). Sans id, pas de sauvegarde API. */
  appointmentId: string | null;
  /** Valeurs initiales depuis la consultation en base */
  initialNotesMedecin: string;
  initialDiagnostic: string;
  /** Ex. bouton Ordonnance à droite du titre */
  headerAction?: ReactNode;
  /** Contexte affiché près des actions pour éviter toute sauvegarde sur un mauvais RDV. */
  appointmentContextLabel?: string | null;
  /** Sync temps réel (ex. alertes cliniques sur le même écran) */
  onNotesPreviewChange?: (notes: string) => void;
  onDiagnosticPreviewChange?: (diagnostic: string) => void;
  /** Après enregistrement explicite (bouton), pour recharger le dossier */
  onSaved?: () => void | Promise<void>;
  /** Classes sur la carte racine (design system) */
  className?: string;
};

/**
 * Éditeur de consultation : notes médecin + diagnostic, avec dictée IA (SOAP).
 * Sauvegarde manuelle via le bouton « Enregistrer les notes ».
 */
export function ConsultationEditor({
  patientId,
  appointmentId,
  initialNotesMedecin,
  initialDiagnostic,
  headerAction,
  appointmentContextLabel,
  onNotesPreviewChange,
  onDiagnosticPreviewChange,
  onSaved,
  className,
}: ConsultationEditorProps) {
  const [notes, setNotes] = useState(initialNotesMedecin);
  const [diagnostic, setDiagnostic] = useState(initialDiagnostic);
  const [dictationTarget, setDictationTarget] = useState<'notes' | 'diagnostic'>('notes');
  const [saving, setSaving] = useState(false);

  const lastSavedRef = useRef({ notes: initialNotesMedecin, diagnostic: initialDiagnostic });
  const hasDraftContent = notes.trim().length > 0 || diagnostic.trim().length > 0;

  useEffect(() => {
    setNotes(initialNotesMedecin);
    setDiagnostic(initialDiagnostic);
    lastSavedRef.current = {
      notes: initialNotesMedecin,
      diagnostic: initialDiagnostic,
    };
    onNotesPreviewChange?.(initialNotesMedecin);
    onDiagnosticPreviewChange?.(initialDiagnostic);
  }, [
    appointmentId,
    initialNotesMedecin,
    initialDiagnostic,
    onNotesPreviewChange,
    onDiagnosticPreviewChange,
  ]);

  const persist = async () => {
    if (!hasDraftContent) {
      toast.error('Renseignez une note ou un diagnostic.');
      return false;
    }
    setSaving(true);
    try {
      const res =
        appointmentId ?
          await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              notes_medecin: notes,
              diagnostic,
            }),
          })
        : await fetch(`/api/patients/${patientId}/consultations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              notes,
              diagnostic,
              source: 'OUT_OF_APPOINTMENT',
              date: new Date().toISOString(),
            }),
          });
      const raw = await res.text();
      if (!res.ok) {
        let msg = raw;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* brut */
        }
        toast.error(msg);
        return false;
      }
      lastSavedRef.current = { notes, diagnostic };
      setNotes('');
      setDiagnostic('');
      onNotesPreviewChange?.('');
      onDiagnosticPreviewChange?.('');
      lastSavedRef.current = { notes: '', diagnostic: '' };
      try {
        await onSaved?.();
      } catch {
        /* refresh history non bloquant */
      }
      toast.success('Notes enregistrées');
      return true;
    } catch {
      toast.error('Erreur réseau lors de l’enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNotes(v);
    onNotesPreviewChange?.(v);
  };

  const handleDiagChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setDiagnostic(v);
    onDiagnosticPreviewChange?.(v);
  };

  const handleDictationResult = (soap: string) => {
    if (dictationTarget === 'notes') {
      setNotes(soap);
      onNotesPreviewChange?.(soap);
    } else {
      setDiagnostic(soap);
      onDiagnosticPreviewChange?.(soap);
    }
  };

  return (
    <Card className={cn('shadow-sm border-slate-200/60', className)}>
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Consultation
            </CardTitle>
            <CardDescription>
              Notes privées médecin et diagnostic — dictée vocale structurée (SOAP). Cliquez sur Enregistrer pour
              sauvegarder.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            {appointmentContextLabel ? (
              <p className="text-xs font-medium text-slate-500 sm:text-right">
                {appointmentContextLabel}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Select
                value={dictationTarget}
                onValueChange={(v) => setDictationTarget(v as 'notes' | 'diagnostic')}
              >
                <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-xs sm:w-[200px]">
                  <SelectValue placeholder="Cible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes">Remplir : notes médecin</SelectItem>
                  <SelectItem value="diagnostic">Remplir : diagnostic</SelectItem>
                </SelectContent>
              </Select>
              <VoiceDictation onResult={handleDictationResult} disabled={saving} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 sm:min-w-[168px]"
                disabled={!hasDraftContent || saving}
                onClick={() => void persist()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
              </Button>
              {headerAction}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {!appointmentId && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
            <p>
              Aucun rendez-vous actif — cette note sera enregistrée directement dans le dossier patient.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="notes-medecin">Notes médecin (compte-rendu / SOAP)</Label>
          <textarea
            id="notes-medecin"
            className="w-full min-h-[200px] p-4 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-y text-slate-700"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Observations cliniques, examen, synthèse SOAP…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diagnostic-field">Diagnostic</Label>
          <textarea
            id="diagnostic-field"
            className="w-full min-h-[120px] p-4 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-y text-slate-700"
            value={diagnostic}
            onChange={handleDiagChange}
            placeholder="Hypothèses diagnostiques, codage…"
          />
        </div>
        <p className="text-xs text-slate-500 text-right">
          Dictée IA : Whisper puis GPT-4o — le texte remplace le champ choisi dans le menu. Les modifications
          manuelles restent possibles ensuite.
        </p>
      </CardContent>
    </Card>
  );
}
