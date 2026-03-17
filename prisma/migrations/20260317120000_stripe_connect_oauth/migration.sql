-- Migration: Replace manual Stripe key storage with OAuth Connect tokens

-- Step 1: Drop rows with NULL stripeAccountId (can't make column NOT NULL with those present)
DELETE FROM "StripeConnection" WHERE "stripeAccountId" IS NULL;

-- Step 2: Add new accessToken column (nullable first so existing rows survive)
ALTER TABLE "StripeConnection" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "StripeConnection" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'read_write';

-- Step 3: Backfill accessToken for any existing rows (empty string placeholder)
UPDATE "StripeConnection" SET "accessToken" = '' WHERE "accessToken" IS NULL;

-- Step 4: Make accessToken NOT NULL now that all rows have a value
ALTER TABLE "StripeConnection" ALTER COLUMN "accessToken" SET NOT NULL;

-- Step 5: Make stripeAccountId NOT NULL
ALTER TABLE "StripeConnection" ALTER COLUMN "stripeAccountId" SET NOT NULL;

-- Step 6: Drop old manual-key columns
ALTER TABLE "StripeConnection" DROP COLUMN "secretKey";
ALTER TABLE "StripeConnection" DROP COLUMN "webhookSecret";
