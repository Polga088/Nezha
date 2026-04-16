/** URL de base de l’app (liens email, redirections). */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
  if (explicit && explicit.trim() !== '') {
    return explicit.replace(/\/$/, '')
  }
  const vercel = process.env.VERCEL_URL
  if (vercel && vercel.trim() !== '') {
    const host = vercel.startsWith('http') ? vercel : `https://${vercel}`
    return host.replace(/\/$/, '')
  }
  return 'http://localhost:3001'
}

/**
 * Lien public de vérification d’ordonnance (jeton opaque = `Prescription.sharingToken`).
 * Le QR code encode cette URL ; le téléchargement PDF reste protégé par la vérification CIN sur `/p/[token]`.
 */
export function buildPrescriptionVerificationPublicUrl(sharingToken: string): string {
  const base = getAppBaseUrl().replace(/\/$/, '')
  return `${base}/p/${encodeURIComponent(sharingToken)}`
}
