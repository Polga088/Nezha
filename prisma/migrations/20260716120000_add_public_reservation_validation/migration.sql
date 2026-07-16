ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "publicValidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publicValidatedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_publicValidatedById_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_publicValidatedById_fkey"
      FOREIGN KEY ("publicValidatedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_publicValidatedById_idx"
  ON "Appointment"("publicValidatedById");
