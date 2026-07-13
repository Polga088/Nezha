DO $$
BEGIN
  CREATE TYPE "StatusSource" AS ENUM ('MANUAL', 'CONSULTATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "manualStatus" "UserStatus",
  ADD COLUMN IF NOT EXISTS "statusSource" "StatusSource" NOT NULL DEFAULT 'MANUAL';

UPDATE "User"
SET
  "manualStatus" = (
    CASE
      WHEN "userStatus" = 'IN_CONSULTATION' THEN 'AVAILABLE'
      ELSE "userStatus"::text
    END
  )::"UserStatus",
  "statusSource" = (
    CASE
      WHEN "userStatus" = 'IN_CONSULTATION' THEN 'CONSULTATION'
      ELSE 'MANUAL'
    END
  )::"StatusSource";
