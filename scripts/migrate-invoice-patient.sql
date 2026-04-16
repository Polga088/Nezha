-- Migration manuelle Invoice → patientId + modePaiement (à exécuter une fois avant `prisma db push` si la table contenait déjà des lignes).

DO $$
BEGIN
  CREATE TYPE "InvoiceModePaiement" AS ENUM ('CASH', 'CARD', 'CHECK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "patientId" TEXT;

UPDATE "Invoice" AS i
SET "patientId" = a."patient_id"
FROM "Appointment" AS a
WHERE i."appointment_id" = a.id;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "modePaiement" "InvoiceModePaiement";

UPDATE "Invoice"
SET "modePaiement" = (
  CASE "methode_paiement"::text
    WHEN 'CASH' THEN 'CASH'::"InvoiceModePaiement"
    WHEN 'CARD' THEN 'CARD'::"InvoiceModePaiement"
    WHEN 'CHECK' THEN 'CHECK'::"InvoiceModePaiement"
    ELSE 'CASH'::"InvoiceModePaiement"
  END
)
WHERE "modePaiement" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "appointment_id" DROP NOT NULL;

ALTER TABLE "Invoice" ALTER COLUMN "patientId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "modePaiement" SET NOT NULL;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_patientId_fkey";
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_appointment_id_fkey";
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "methode_paiement";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "updatedAt";
