import { z } from 'zod';

// One per-branch summary card on the pharmacy-admin dashboard. Each carries the
// live rollups the admin cares about at a glance, and links into that branch.
const pharmacyBranchStatSchema = z.object({
  branchId: z.uuid(),
  name: z.string(),
  // Staff assigned to the branch (all roles).
  staff: z.number().int().nonnegative(),
  // Inquiries still needing attention (PENDING or IN_PROGRESS).
  openInquiries: z.number().int().nonnegative(),
  // Medicines at the branch whose summed batch quantity is below the low-stock
  // threshold (see the API's STOCK thresholds, mirrored from lib/stock.ts).
  lowStock: z.number().int().nonnegative(),
  // Batches expiring within the near-expiry window (not yet expired).
  nearExpiry: z.number().int().nonnegative(),
});
export type PharmacyBranchStat = z.infer<typeof pharmacyBranchStatSchema>;

// Aggregate KPI counts for the pharmacy-admin dashboard (`/pharmacy`), scoped to
// the caller's pharmacy across all its branches, plus a per-branch breakdown.
export const pharmacyStatsResponseSchema = z.object({
  branches: z.number().int().nonnegative(),
  employees: z.number().int().nonnegative(),
  openInquiries: z.number().int().nonnegative(),
  lowStock: z.number().int().nonnegative(),
  perBranch: z.array(pharmacyBranchStatSchema),
});
export type PharmacyStatsResponse = z.infer<typeof pharmacyStatsResponseSchema>;
