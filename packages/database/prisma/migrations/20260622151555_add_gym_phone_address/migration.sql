-- AlterTable: add nullable first, backfill, then set NOT NULL
ALTER TABLE "public"."Gym"
  ADD COLUMN "phone"   TEXT,
  ADD COLUMN "address" TEXT;

UPDATE "public"."Gym" SET "phone" = '', "address" = '' WHERE "phone" IS NULL;

ALTER TABLE "public"."Gym"
  ALTER COLUMN "phone"   SET NOT NULL,
  ALTER COLUMN "address" SET NOT NULL;
