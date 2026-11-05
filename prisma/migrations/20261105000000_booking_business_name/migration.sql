-- Migration: Booking.businessType -> Booking.businessName
--
-- Booking.businessType has always stored the customer's *business name*, not a
-- category (see BookDemo's submit mapping). Rename it to what it actually holds
-- and drop the misleading field.
--
-- Written for review only. Not applied to any database.
-- This project has no _prisma_migrations table (the schema was managed with
-- `prisma db push`), so apply manually with psql, or use
-- `prisma migrate diff` / `prisma db push` after reviewing.

-- Step 1: add the correctly named column
ALTER TABLE "Booking" ADD COLUMN "businessName" TEXT;

-- Step 2: backfill from businessType
UPDATE "Booking"
SET "businessName" = NULLIF(TRIM("businessType"), '')
WHERE "businessName" IS NULL;

-- Step 3: confirm the backfill before running step 4 -- expect 0
-- SELECT COUNT(*) FROM "Booking"
--   WHERE "businessName" IS NULL AND "businessType" IS NOT NULL;

-- Step 4: drop the old column
ALTER TABLE "Booking" DROP COLUMN "businessType";
