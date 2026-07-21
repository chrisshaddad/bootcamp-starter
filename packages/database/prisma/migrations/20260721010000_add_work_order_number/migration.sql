-- Add an org-scoped, human-readable sequential number to WorkOrder (rendered as
-- `WO-000123` in the UI). New column added nullable, backfilled per org by
-- creation order, then made NOT NULL with a per-org unique index.

-- 1) Add the column (nullable for the backfill window).
ALTER TABLE "WorkOrder" ADD COLUMN "number" INTEGER;

-- 2) Backfill: number existing rows 1..N within each org, ordered by createdAt
--    (id as a stable tie-breaker) so numbers are deterministic.
WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "orgId" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "WorkOrder"
)
UPDATE "WorkOrder" AS w
SET "number" = numbered.rn
FROM numbered
WHERE w."id" = numbered."id";

-- 3) Enforce NOT NULL now that every row has a value.
ALTER TABLE "WorkOrder" ALTER COLUMN "number" SET NOT NULL;

-- 4) Guarantee uniqueness of (orgId, number). The application assigns the next
--    number under a per-org advisory lock; this index is the backstop.
CREATE UNIQUE INDEX "WorkOrder_orgId_number_key" ON "WorkOrder"("orgId", "number");
