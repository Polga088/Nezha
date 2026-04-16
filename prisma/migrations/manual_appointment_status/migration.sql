-- Migration manuelle des statuts RDV (anciens → nouveaux).
-- Exécuter avant `prisma db push` si la base contient encore les anciennes valeurs d'enum.

ALTER TABLE "Appointment" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "statut" TYPE TEXT USING ("statut"::text);

DROP TYPE IF EXISTS "AppointmentStatus";

CREATE TYPE "AppointmentStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'PAID', 'CANCELED');

UPDATE "Appointment" SET "statut" = 'WAITING' WHERE "statut" IN ('PROGRAMME', 'WAITING_ROOM');
UPDATE "Appointment" SET "statut" = 'IN_PROGRESS' WHERE "statut" = 'IN_CONSULTATION';
UPDATE "Appointment" SET "statut" = 'FINISHED' WHERE "statut" = 'COMPLETED';
UPDATE "Appointment" SET "statut" = 'CANCELED' WHERE "statut" = 'CANCELED';

ALTER TABLE "Appointment"
  ALTER COLUMN "statut" TYPE "AppointmentStatus" USING ("statut"::"AppointmentStatus");

ALTER TABLE "Appointment"
  ALTER COLUMN "statut" SET DEFAULT 'WAITING'::"AppointmentStatus";
