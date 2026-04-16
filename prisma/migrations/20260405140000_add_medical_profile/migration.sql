-- Enum sexe + champs profil médical (Patient)
-- Colonne `groupe_sanguin` existante conservée ; exposée côté Prisma comme `groupeSanguin`.

CREATE TYPE "Sexe" AS ENUM ('MASCULIN', 'FEMININ');

ALTER TABLE "Patient" ADD COLUMN "cin" TEXT;
ALTER TABLE "Patient" ADD COLUMN "sexe" "Sexe";
ALTER TABLE "Patient" ADD COLUMN "taille" DOUBLE PRECISION;
ALTER TABLE "Patient" ADD COLUMN "poids" DOUBLE PRECISION;
