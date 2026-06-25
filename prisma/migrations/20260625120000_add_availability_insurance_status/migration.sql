-- Extend UserStatus for clinical workflow
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'IN_CONSULTATION';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ON_BREAK';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DONE_TODAY';

-- Weekly doctor schedule (was missing from prior migrations)
CREATE TABLE IF NOT EXISTS "Availability" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "weekly" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Availability_doctor_id_key" ON "Availability"("doctor_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Availability_doctor_id_fkey'
    ) THEN
        ALTER TABLE "Availability" ADD CONSTRAINT "Availability_doctor_id_fkey"
            FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Admin-managed insurance types
CREATE TABLE IF NOT EXISTS "InsuranceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceType_code_key" ON "InsuranceType"("code");

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "insurance_type_id" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Patient_insurance_type_id_fkey'
    ) THEN
        ALTER TABLE "Patient" ADD CONSTRAINT "Patient_insurance_type_id_fkey"
            FOREIGN KEY ("insurance_type_id") REFERENCES "InsuranceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Patient_insurance_type_id_idx" ON "Patient"("insurance_type_id");

-- Seed default insurance types from legacy enum (idempotent)
INSERT INTO "InsuranceType" ("id", "name", "code", "description", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'Aucune', 'AUCUNE', 'Pas de couverture déclarée', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'CNSS', 'CNSS', 'Caisse nationale de sécurité sociale', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'CNOPS', 'CNOPS', 'Caisse nationale des organismes de prévoyance sociale', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'FAR', 'FAR', 'Forces armées royales', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'RAMED', 'RAMID', 'Régime d''assistance médicale', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Mutuelle privée', 'MUTUELLE_PRIVEE', 'Complémentaire / mutuelle privée', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Autre', 'AUTRE', 'Autre organisme', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- Backfill patient insurance_type_id from legacy assuranceType enum
UPDATE "Patient" p
SET "insurance_type_id" = it."id"
FROM "InsuranceType" it
WHERE p."insurance_type_id" IS NULL
  AND it."code" = p."assuranceType"::text;
