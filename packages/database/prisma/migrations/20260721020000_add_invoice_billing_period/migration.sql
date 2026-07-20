-- Recurring rent invoices (Sprint F3.1). Adds a nullable billing-period key
-- (`YYYY-MM`) plus a unique index on (leaseId, billingPeriod) so the scheduled
-- generator is idempotent per (lease, month). Postgres treats NULLs as distinct,
-- so existing/manual invoices (billingPeriod IS NULL) never collide.

ALTER TABLE "Invoice" ADD COLUMN "billingPeriod" TEXT;

CREATE UNIQUE INDEX "Invoice_leaseId_billingPeriod_key" ON "Invoice"("leaseId", "billingPeriod");
