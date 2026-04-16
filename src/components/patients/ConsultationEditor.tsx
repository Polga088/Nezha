'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

const DEBOUNCE_MS = 2000;

export type ConsultationEditorProps = {
  /** RDV cible (dernier RDV du patient, etc.). Sans id, pas de sauvegarde API. */
  appointmentId: string | null;
  /** Valeurs initiales depuis la consultation en base */
  initialNotesMedecin: string;
  initialDiagnostic: string;
  /** Ex. bouton Ordonnance à droite du titre */
  headerAction?: ReactNode;
  /** Sync temps réel (ex. alertes cliniques sur le même écran) */
  onNotesPreviewChange?: (notes: string) => void;
  onDiagnosticPreviewChange?: (diagnostic: string) => void;
  /** Après enregistrement explicite (bouton), pour recharger le dossier */
  onSaved?: () => void;
  /** Classes sur la carte racine (design system) */
  className?: string;
};

/**
 * Éditeur de consultation : notes médecin + diagnostic, avec dictée IA (SOAP).
 * Sauvegarde automatique 2 s après la fin de frappe, ou bouton « Enregistrer les notes ».
 */
export function ConsultationEditor({
  appointmentId,
  initialNotesMedecin,
  initialDiagnostic,
  headerAction,
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

  const persist = useCallback(
    async (silent?: boolean) => {
      if (!appointmentId) {
        if (!silent) toast.error('Aucun rendez-vous associé — créez un RDV depuis l’agenda.');
        return false;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            notes_medecin: notes,
            diagnostic,
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
        if (!silent) {
          toast.success('Notes enregistrées');
          onSaved?.();
        }
        return true;
      } catch {
        toast.error('Erreur réseau lors de l’enregistrement');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [appointmentId, notes, diagnostic, onSaved]
  );

  useEffect(() => {
    if (!appointmentId) return;
    if (
      notes === lastSavedRef.current.notes &&
      diagnostic === lastSavedRef.current.diagnostic
    ) {
      return;
    }
    const t = setTimeout(() => {
      void persist(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [notes, diagnostic, appointmentId, persist]);

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
              Notes privées médecin et diagnostic — dictée vocale structurée (SOAP). Sauvegarde automatique
              après 2 s sans frappe.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Select
              value={dictationTarget}
              onValueChange={(v) => setDictationTarget(v as 'notes' | 'diagnostic')}
            >
              <SelectTrigger className="w-[200px] h-9 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Cible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notes">Remplir : notes médecin</SelectItem>
                <SelectItem value="diagnostic">Remplir : diagnostic</SelectItem>
              </SelectContent>
            </Select>
            <VoiceDictation onResult={handleDictationResult} disabled={!appointmentId} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={!appointmentId || saving}
              onClick={() => void persist(false)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les notes
            </Button>
            {headerAction}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {!appointmentId && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Aucun rendez-vous récent pour attacher ces notes — planifiez un RDV depuis l’agenda.
          </p>
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
