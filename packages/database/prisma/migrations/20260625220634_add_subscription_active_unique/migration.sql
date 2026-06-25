-- Partial unique index: only one ACTIVE subscription per member+plan.
-- NULL planId rows are excluded (PostgreSQL treats NULLs as non-equal in unique indexes).
CREATE UNIQUE INDEX "Subscription_memberId_planId_active_key"
  ON "public"."Subscription" ("memberId", "planId")
  WHERE (status = 'ACTIVE');
