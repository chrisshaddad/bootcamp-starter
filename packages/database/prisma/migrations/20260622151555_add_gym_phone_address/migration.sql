-- AlterTable: add nullable, remove rows that lack real contact data, then enforce NOT NULL
ALTER TABLE "public"."Gym"
  ADD COLUMN "phone"   TEXT,
  ADD COLUMN "address" TEXT;

-- Existing rows have no real phone/address — delete rather than backfill with invalid placeholders.
DELETE FROM "public"."Gym" WHERE "phone" IS NULL;

ALTER TABLE "public"."Gym"
  ALTER COLUMN "phone"   SET NOT NULL,
  ALTER COLUMN "address" SET NOT NULL;
