'use client';

import { useMemo } from 'react';
import { AlertOctagon } from 'lucide-react';

/** Détection simple dans les notes / dossier (UX d’alerte, non exhaustive). */
const ALLERGY_PATTERN =
  /\b(allergie|allergies|allergique|pénicilline|penicilline|latex|arachide|cacao|iode|sulfamides|aspirine|anti[- ]?inflammatoire)\b/i;

const DIABETE_PATTERN =
  /\b(diabète|diabete|diabetes|dt1|dt2|type\s*1|type\s*2|insulin|insuline|glycémie|glycemie|hba1c|antidiabétique)\b/i;

export function extractClinicalAlertLabels(
  notes: string,
  allergies: string | null | undefined,
  antecedents: string | null | undefined
): string[] {
  const labels: string[] = [];
  const blob = `${notes}\n${allergies ?? ''}\n${antecedents ?? ''}`;

  const hasAllergyField = Boolean(allergies?.trim());
  const hasAllergyKeyword = ALLERGY_PATTERN.test(blob);
  if (hasAllergyField || hasAllergyKeyword) {
    labels.push('Allergies');
  }

  if (DIABETE_PATTERN.test(blob)) {
    labels.push('Diabète');
  }

  return [...new Set(labels)];
}

type Props = {
  notes: string;
  allergies?: string | null;
  antecedents?: string | null;
};

/**
 * Badges d’alerte « flashy » à partir du dossier + notes (mots-clés Allergies / Diabète).
 */
export function PatientClinicalAlerts({ notes, allergies, antecedents }: Props) {
  const labels = useMemo(
    () => extractClinicalAlertLabels(notes, allergies, antecedents),
    [notes, allergies, antecedents]
  );

  if (labels.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Aucune alerte clé détectée dans les notes
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-label="Alertes cliniques">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-500 bg-gradient-to-b from-red-500 to-red-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-red-500/40 ring-2 ring-red-400/60 animate-pulse"
        >
          <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
