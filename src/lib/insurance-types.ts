import { z } from 'zod';

export const insuranceTypeInputSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (min. 2 caractères)'),
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9_]+$/, 'Code en majuscules sans espaces (ex. CNSS)'),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type InsuranceTypeInput = z.infer<typeof insuranceTypeInputSchema>;

export type InsuranceTypeDto = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  patientCount?: number;
  createdAt: string;
  updatedAt: string;
};

/** Normalise un code assurance (majuscules, underscores). */
export function normalizeInsuranceCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}
