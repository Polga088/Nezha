import { z } from 'zod';

/** Ligne telle qu’enregistrée en JSON (PDF / historique). */
export const medicamentLineSchema = z.object({
  nom: z.string().min(1),
  /** Ex. 500 mg, 1 g */
  dosage: z.string().optional(),
  posologie: z.string().min(1),
  duree: z.string().optional(),
});

export const medicamentsSchema = z.array(medicamentLineSchema).min(1);

export type MedicamentLine = z.infer<typeof medicamentLineSchema>;

/** Saisie API / formulaires (posologie optionnelle si dosage/durée). */
export const medicamentInputSchema = z.object({
  nom: z.string().min(1),
  dosage: z.string().optional(),
  posologie: z.string().optional(),
  duree: z.string().optional(),
});

export const medicamentsPayloadSchema = z.array(medicamentInputSchema).min(1);

export type MedicamentInputPayload = z.infer<typeof medicamentInputSchema>;

export function parseMedicamentsJson(raw: unknown): MedicamentLine[] | null {
  const r = medicamentsSchema.safeParse(raw);
  return r.success ? r.data : null;
}
