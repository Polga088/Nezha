import { cache } from 'react';

import { mergePublicCabinetBranding } from '@/lib/cabinet-branding';
import { ensureGlobalSettings } from '@/lib/global-settings';

/**
 * Lecture serveur (RSC, API) — mêmes valeurs fusionnées que GET /api/public/cabinet.
 * Mis en cache par requête RSC pour éviter les lectures doubles (ex. header + page d’accueil).
 */
export const getPublicCabinetBranding = cache(async function getPublicCabinetBranding() {
  const row = await ensureGlobalSettings();
  return mergePublicCabinetBranding({
    cabinetName: row.cabinetName,
    doctorDisplayName: row.doctorDisplayName,
    logoUrl: row.logoUrl,
    cabinetPhone: row.cabinetPhone,
    cabinetEmail: row.cabinetEmail,
    cabinetAddress: row.cabinetAddress,
    cabinetCityLine: row.cabinetCityLine,
    mapEmbedUrl: row.mapEmbedUrl,
    openingHours: row.openingHours,
  });
});
