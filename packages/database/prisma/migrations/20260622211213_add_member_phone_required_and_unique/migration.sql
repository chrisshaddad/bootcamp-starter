-- Pre-flight checks: abort with a clear message if dirty data exists so that a
-- proper backfill can be performed before re-running this migration.
DO $$
DECLARE
  null_phones  BIGINT;
  dup_emails   BIGINT;
  dup_phones   BIGINT;
BEGIN
  SELECT COUNT(*) INTO null_phones
  FROM "public"."Member"
  WHERE "phoneNumber" IS NULL;

  SELECT COUNT(*) INTO dup_emails
  FROM (
    SELECT 1 FROM "public"."Member"
    GROUP BY "gymId", "email"
    HAVING COUNT(*) > 1
  ) sub;

  SELECT COUNT(*) INTO dup_phones
  FROM (
    SELECT 1 FROM "public"."Member"
    WHERE "phoneNumber" IS NOT NULL
    GROUP BY "gymId", "phoneNumber"
    HAVING COUNT(*) > 1
  ) sub;

  IF null_phones > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % Member row(s) have NULL phoneNumber. Backfill before re-running.',
      null_phones;
  END IF;

  IF dup_emails > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % (gymId, email) duplicate group(s) found. Deduplicate before re-running.',
      dup_emails;
  END IF;

  IF dup_phones > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % (gymId, phoneNumber) duplicate group(s) found. Deduplicate before re-running.',
      dup_phones;
  END IF;
END $$;

-- AlterTable: make phoneNumber non-nullable
ALTER TABLE "public"."Member" ALTER COLUMN "phoneNumber" SET NOT NULL;

-- CreateIndex: unique email per gym
CREATE UNIQUE INDEX "Member_gymId_email_key" ON "public"."Member"("gymId", "email");

-- CreateIndex: unique phone per gym
CREATE UNIQUE INDEX "Member_gymId_phoneNumber_key" ON "public"."Member"("gymId", "phoneNumber");
