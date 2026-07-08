import { z } from 'zod';

// Platform-wide aggregate counts for the super-admin dashboard KPI cards.
//
// Totals are unscoped (every row, including the calling admin) — this is a
// whole-platform overview, unlike the `/users` list which drops the caller.
// Each `newThisWeek` is the number of rows created in the trailing 7 days, i.e.
// the real week-over-week growth shown on each card.
export const platformStatsResponseSchema = z.object({
  users: z.object({
    total: z.number(),
    active: z.number(),
    pending: z.number(),
    inactive: z.number(),
    suspended: z.number(),
    newThisWeek: z.number(),
  }),
  pharmacies: z.object({
    total: z.number(),
    // Pharmacies that have at least one branch (vs. registered-but-empty).
    withBranch: z.number(),
    newThisWeek: z.number(),
  }),
  branches: z.object({
    total: z.number(),
  }),
  medicines: z.object({
    total: z.number(),
    priced: z.number(),
    withBarcode: z.number(),
    newThisWeek: z.number(),
  }),
});
export type PlatformStatsResponse = z.infer<typeof platformStatsResponseSchema>;
