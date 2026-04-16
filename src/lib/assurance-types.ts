import type { AssuranceType } from '@/generated/prisma/client'

export const ASSURANCE_TYPE_VALUES = [
  'AUCUNE',
  'CNSS',
  'CNOPS',
  'FAR',
  'RAMID',
  'MUTUELLE_PRIVEE',
  'AUTRE',
] as const satisfies readonly AssuranceType[]

export type AssuranceTypeValue = (typeof ASSURANCE_TYPE_VALUES)[number]

export const ASSURANCE_TYPE_LABELS: Record<AssuranceTypeValue, string> = {
  AUCUNE: 'Aucune',
  CNSS: 'CNSS',
  CNOPS: 'CNOPS',
  FAR: 'FAR',
  RAMID: 'RAMID',
  MUTUELLE_PRIVEE: 'Mutuelle privée',
  AUTRE: 'Autre',
}

/** Classes Tailwind pour badges d’organisme (UI Clinical Architect). */
export const assuranceTypeBadgeClassName = (type: AssuranceTypeValue): string => {
  switch (type) {
    case 'CNSS':
      return 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50'
    case 'CNOPS':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50'
    case 'FAR':
      return 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-50'
    case 'RAMID':
      return 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-50'
    case 'MUTUELLE_PRIVEE':
      return 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-50'
    case 'AUTRE':
      return 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50'
    case 'AUCUNE':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50'
  }
}

/** Couverture déclarée (hors « Aucune ») — pour liste / badges. */
export const hasDeclaredAssurance = (
  assuranceType: string | null | undefined
): boolean => {
  if (!assuranceType || assuranceType === 'AUCUNE') return false
  return (ASSURANCE_TYPE_VALUES as readonly string[]).includes(assuranceType)
}
