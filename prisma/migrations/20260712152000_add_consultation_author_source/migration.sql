CREATE TYPE "ConsultationSource" AS ENUM ('MANUAL', 'OUT_OF_APPOINTMENT');

ALTER TABLE "Consultation"
  ADD COLUMN "source" "ConsultationSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "author_id" TEXT;

CREATE INDEX "Consultation_author_id_idx" ON "Consultation"("author_id");

ALTER TABLE "Consultation"
  ADD CONSTRAINT "Consultation_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
