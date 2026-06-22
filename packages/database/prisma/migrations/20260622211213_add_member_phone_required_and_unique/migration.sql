-- Data-conditioning: fill NULL phone numbers with a unique placeholder so the
-- NOT NULL constraint below does not fail on rows created before this migration.
UPDATE "public"."Member"
SET "phoneNumber" = CONCAT('unknown-', "id")
WHERE "phoneNumber" IS NULL;

-- Data-conditioning: de-duplicate emails within the same gym so the unique
-- index below does not fail on pre-existing duplicates.
WITH dup_emails AS (
  SELECT "id",
    ROW_NUMBER() OVER (
      PARTITION BY "gymId", "email" ORDER BY "createdAt"
    ) AS rn
  FROM "public"."Member"
)
UPDATE "public"."Member" m
SET "email" = CONCAT(m."email", '+dup-', m."id")
FROM dup_emails d
WHERE m."id" = d."id" AND d.rn > 1;

-- Data-conditioning: de-duplicate phone numbers within the same gym.
WITH dup_phones AS (
  SELECT "id",
    ROW_NUMBER() OVER (
      PARTITION BY "gymId", "phoneNumber" ORDER BY "createdAt"
    ) AS rn
  FROM "public"."Member"
)
UPDATE "public"."Member" m
SET "phoneNumber" = CONCAT(m."phoneNumber", '-dup-', m."id")
FROM dup_phones d
WHERE m."id" = d."id" AND d.rn > 1;

-- AlterTable: make phoneNumber non-nullable
ALTER TABLE "public"."Member" ALTER COLUMN "phoneNumber" SET NOT NULL;

-- CreateIndex: unique email per gym
CREATE UNIQUE INDEX "Member_gymId_email_key" ON "public"."Member"("gymId", "email");

-- CreateIndex: unique phone per gym
CREATE UNIQUE INDEX "Member_gymId_phoneNumber_key" ON "public"."Member"("gymId", "phoneNumber");
