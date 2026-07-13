import { z } from 'zod';
import { auditLogItemSchema } from '../audit';

// Aggregate counts + recent activity for the branch dashboard (`/branch`),
// scoped to the caller's own branch. Powers the manager/employee overview:
// low-stock and near-expiry alerts, the open-inquiry count, and a short feed of
// recent activity by this branch's staff (reuses the audit log item shape).
export const branchStatsResponseSchema = z.object({
  // Medicines at the branch whose summed batch quantity is below the low-stock
  // threshold (mirrored from lib/stock.ts).
  lowStock: z.number().int().nonnegative(),
  // Batches expiring within the near-expiry window (not yet expired).
  nearExpiry: z.number().int().nonnegative(),
  // Inquiries still needing attention (PENDING or IN_PROGRESS).
  openInquiries: z.number().int().nonnegative(),
  // Most recent audit entries by this branch's staff, newest first.
  recentActivity: z.array(auditLogItemSchema),
});
export type BranchStatsResponse = z.infer<typeof branchStatsResponseSchema>;
