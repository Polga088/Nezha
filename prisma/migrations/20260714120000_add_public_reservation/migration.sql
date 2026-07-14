ALTER TABLE "GlobalSettings"
  ADD COLUMN IF NOT EXISTS "publicReservationCndpText" TEXT,
  ADD COLUMN IF NOT EXISTS "publicReservationCndpVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "publicReservationPrivacyUrl" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "reservationSource" TEXT NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS "publicBookingToken" TEXT,
  ADD COLUMN IF NOT EXISTS "publicConsentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicConsentVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "publicConsentTextSnapshot" TEXT;

UPDATE "Appointment"
SET "reservationSource" = 'INTERNAL'
WHERE "reservationSource" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_reservationSource_check'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_reservationSource_check"
      CHECK ("reservationSource" IN ('INTERNAL', 'RESERVATION_PUBLIC'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_publicBookingToken_key"
  ON "Appointment"("publicBookingToken");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Appointment"
    WHERE "statut" <> 'CANCELED'
    GROUP BY "doctor_id", "date_heure"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Impossible de créer l''index unique partiel sur Appointment: doublons actifs existants';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_doctor_id_date_heure_active_key"
  ON "Appointment"("doctor_id", "date_heure")
  WHERE "statut" <> 'CANCELED';
