import { cache } from 'react';

import { mergePublicCabinetBranding } from '@/lib/cabinet-branding';
import { ensureGlobalSettings } from '@/lib/global-settings';
import type { PublicHeroSlideRow } from '@/lib/cabinet-branding';
import { prisma } from '@/lib/prisma';

/**
 * Lecture serveur (RSC, API) — mêmes valeurs fusionnées que GET /api/public/cabinet.
 * Mis en cache par requête RSC pour éviter les lectures doubles (ex. header + page d’accueil).
 */
export const getPublicCabinetBranding = cache(async function getPublicCabinetBranding() {
  const row = await ensureGlobalSettings();
  const publicHeroSlides = (await prisma.publicHeroSlide.findMany({
    where: { settingsId: row.id, isActive: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      imageUrl: true,
      altText: true,
      position: true,
      isActive: true,
    },
  })) as PublicHeroSlideRow[];
  return mergePublicCabinetBranding({
    cabinetName: row.cabinetName,
    doctorDisplayName: row.doctorDisplayName,
    publicSiteName: row.publicSiteName,
    publicDoctorDisplayName: row.publicDoctorDisplayName,
    publicSpecialty: row.publicSpecialty,
    publicHeroEyebrow: row.publicHeroEyebrow,
    publicHeroTitle: row.publicHeroTitle,
    publicHeroDescription: row.publicHeroDescription,
    publicPrimaryButtonLabel: row.publicPrimaryButtonLabel,
    publicSecondaryButtonLabel: row.publicSecondaryButtonLabel,
    publicFeature1Title: row.publicFeature1Title,
    publicFeature1Description: row.publicFeature1Description,
    publicFeature2Title: row.publicFeature2Title,
    publicFeature2Description: row.publicFeature2Description,
    publicFeature3Title: row.publicFeature3Title,
    publicFeature3Description: row.publicFeature3Description,
    publicMetaTitle: row.publicMetaTitle,
    publicMetaDescription: row.publicMetaDescription,
    publicHeroBackgroundMode: row.publicHeroBackgroundMode,
    publicHeroBackgroundGradientFrom: row.publicHeroBackgroundGradientFrom,
    publicHeroBackgroundGradientTo: row.publicHeroBackgroundGradientTo,
    publicHeroBackgroundGradientDirection: row.publicHeroBackgroundGradientDirection,
    publicHeroBackgroundImageUrl: row.publicHeroBackgroundImageUrl,
    publicHeroBackgroundOverlay: row.publicHeroBackgroundOverlay,
    publicHeroBackgroundSliderIntervalMs: row.publicHeroBackgroundSliderIntervalMs,
    logoUrl: row.logoUrl,
    cabinetPhone: row.cabinetPhone,
    cabinetEmail: row.cabinetEmail,
    cabinetAddress: row.cabinetAddress,
    cabinetCityLine: row.cabinetCityLine,
    mapEmbedUrl: row.mapEmbedUrl,
    openingHours: row.openingHours,
    publicHeroSlides,
  });
});
