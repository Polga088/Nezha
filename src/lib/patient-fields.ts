import { z } from 'zod'

import { ASSURANCE_TYPE_VALUES, type AssuranceTypeValue } from '@/lib/assurance-types'

const SEXE_SET = new Set<string>(['MASCULIN', 'FEMININ']);

/** Téléphone entièrement optionnel — chaîne vide ou omis ; pas de format imposé. */
export const zOptionalPatientTel = z.union([z.literal(''), z.string().max(40)]).optional()

const ASSURANCE_SET = new Set<string>(ASSURANCE_TYPE_VALUES);

export function parseSexe(raw: unknown): 'MASCULIN' | 'FEMININ' | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).toUpperCase();
  if (s === 'M' || s === 'MASCULIN') return 'MASCULIN';
  if (s === 'F' || s === 'FEMININ') return 'FEMININ';
  if (SEXE_SET.has(s)) return s as 'MASCULIN' | 'FEMININ';
  return undefined;
}

export function parseOptionalFloat(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Parse assurance (CSV / API) — accepte libellés FR courts. */
export function parseAssuranceType(raw: unknown): AssuranceTypeValue | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (s === '-' || s === 'NONE' || s === 'N/A') return 'AUCUNE';
  if (ASSURANCE_SET.has(s)) return s as AssuranceTypeValue;
  const aliases: Record<string, AssuranceTypeValue> = {
    MUTUELLE: 'MUTUELLE_PRIVEE',
    PRIVEE: 'MUTUELLE_PRIVEE',
    PRIVE: 'MUTUELLE_PRIVEE',
  };
  if (aliases[s]) return aliases[s];
  return undefined;
}
