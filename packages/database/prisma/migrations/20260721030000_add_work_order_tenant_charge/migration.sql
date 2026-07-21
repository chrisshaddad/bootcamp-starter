-- Opt-in "charge the tenant" for a work order (Sprint F3.2, decision D2 —
-- default OFF). When chargeToTenant is set with a tenantChargeAmount, completing
-- the work order adds one invoice line item on the apartment's active lease.
-- tenantChargedAt records when the charge was applied so re-completing a work
-- order can never double-bill the tenant.

ALTER TABLE "WorkOrder" ADD COLUMN "chargeToTenant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkOrder" ADD COLUMN "tenantChargeAmount" DECIMAL(12,2);
ALTER TABLE "WorkOrder" ADD COLUMN "tenantChargedAt" TIMESTAMP(3);
