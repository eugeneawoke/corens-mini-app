-- First-pass schema changes for real Profile flow persistence.
-- Apply with your normal migration workflow once DATABASE_URL points to the target Postgres.

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "stateKey" TEXT NOT NULL DEFAULT 'calm',
  ADD COLUMN IF NOT EXISTS "intentKey" TEXT NOT NULL DEFAULT 'slow-dialogue',
  ADD COLUMN IF NOT EXISTS "trustKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'Profile'
      AND constraint_name = 'Profile_userId_fkey'
  ) THEN
    ALTER TABLE "Profile"
      ADD CONSTRAINT "Profile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
