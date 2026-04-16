import type { MedicamentLine } from '@/lib/prescription-types';

export type MedicamentInput = {
  nom: string;
  dosage?: string | null;
  posologie?: string | null;
  duree?: string | null;
};

/**
 * Construit une ligne stockée (avec posologie obligatoire pour le PDF)
 * à partir d’une saisie simple Nom / Dosage / Durée (± posologie libre).
 */
export function normalizeMedicamentLine(input: MedicamentInput): MedicamentLine {
  const nom = input.nom.trim();
  const dosage = input.dosage?.trim() || undefined;
  const duree = input.duree?.trim() || undefined;
  const posRaw = input.posologie?.trim();
  let posologie = posRaw ?? '';
  if (!posologie) {
    const parts: string[] = [];
    if (dosage) parts.push(`Dosage : ${dosage}`);
    if (duree) parts.push(`Durée : ${duree}`);
    posologie = parts.length > 0 ? parts.join(' — ') : 'Selon avis médical';
  }
  return {
    nom,
    posologie,
    ...(dosage ? { dosage } : {}),
    ...(duree ? { duree } : {}),
  };
}
