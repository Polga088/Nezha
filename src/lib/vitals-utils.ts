/**
 * Seuils de référence (orientation clinique, à adapter au protocole du cabinet).
 * Glycémie : mg/dL (jeûn / plage usuelle).
 * Tension : classification simplifiée type ESC (optimal vs le reste).
 */

/** Couleur texte Tailwind selon la glycémie (mg/dL). */
export function getGlycemiaColor(val: number): string {
  if (!Number.isFinite(val)) return 'text-slate-600'
  if (val < 54) return 'text-red-600'
  if (val < 70) return 'text-orange-500'
  if (val <= 99) return 'text-green-600'
  if (val <= 125) return 'text-orange-500'
  return 'text-red-600'
}

/** Couleur texte Tailwind selon la TA « sys/dia » (mmHg). */
export function getTensionColor(ta: string | null | undefined): string {
  if (ta == null || String(ta).trim() === '') return 'text-slate-600'
  const parsed = parseTensionMmHg(ta)
  if (!parsed) return 'text-slate-600'
  const { systolique: sys, diastolique: dia } = parsed
  if (sys >= 140 || dia >= 90) return 'text-red-600'
  if (sys < 120 && dia < 80) return 'text-green-600'
  return 'text-orange-500'
}

export function parseTensionMmHg(
  ta: string | null | undefined
): { systolique: number; diastolique: number } | null {
  if (ta == null || String(ta).trim() === '') return null
  const m = /^(\d{2,3})\/(\d{2,3})$/.exec(String(ta).trim())
  if (!m) return null
  const systolique = parseInt(m[1], 10)
  const diastolique = parseInt(m[2], 10)
  if (!Number.isFinite(systolique) || !Number.isFinite(diastolique)) return null
  return { systolique, diastolique }
}

/** Classes complètes pour badge glycémie (fond + bordure + texte lisible). */
export function getGlycemiaBadgeClassName(val: number): string {
  const tone = getGlycemiaColor(val)
  if (tone === 'text-green-600') {
    return 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900'
  }
  if (tone === 'text-orange-500') {
    return 'border-amber-200/90 bg-amber-50/95 text-amber-950'
  }
  return 'border-red-200/90 bg-red-50/95 text-red-900'
}

/** Classes complètes pour badge tension. */
export function getTensionBadgeClassName(ta: string | null | undefined): string {
  const tone = getTensionColor(ta)
  if (tone === 'text-green-600') {
    return 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900'
  }
  if (tone === 'text-orange-500') {
    return 'border-amber-200/90 bg-amber-50/95 text-amber-950'
  }
  if (tone === 'text-red-600') {
    return 'border-red-200/90 bg-red-50/95 text-red-900'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800'
}
