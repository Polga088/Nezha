-- Migration manuelle : configuration de la page publique + slider hero.
-- Rejouable : les objets et colonnes sont créés seulement s’ils n’existent pas déjà.

ALTER TABLE "GlobalSettings"
  ADD COLUMN IF NOT EXISTS "publicSiteName" TEXT,
  ADD COLUMN IF NOT EXISTS "publicDoctorDisplayName" TEXT,
  ADD COLUMN IF NOT EXISTS "publicSpecialty" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroEyebrow" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "publicPrimaryButtonLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "publicSecondaryButtonLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature1Title" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature1Description" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature2Title" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature2Description" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature3Title" TEXT,
  ADD COLUMN IF NOT EXISTS "publicFeature3Description" TEXT,
  ADD COLUMN IF NOT EXISTS "publicMetaTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "publicMetaDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundMode" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundGradientFrom" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundGradientTo" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundGradientDirection" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundOverlay" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "publicHeroBackgroundSliderIntervalMs" INTEGER;

CREATE TABLE IF NOT EXISTS "PublicHeroSlide" (
  "id" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL DEFAULT 'default',
  "imageUrl" TEXT NOT NULL,
  "altText" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicHeroSlide_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PublicHeroSlide_settingsId_fkey'
  ) THEN
    ALTER TABLE "PublicHeroSlide"
      ADD CONSTRAINT "PublicHeroSlide_settingsId_fkey"
      FOREIGN KEY ("settingsId") REFERENCES "GlobalSettings"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PublicHeroSlide_settingsId_position_idx"
  ON "PublicHeroSlide" ("settingsId", "position");
