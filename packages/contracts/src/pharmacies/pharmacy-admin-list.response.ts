import { z } from 'zod';
import { dateSchema } from '../common';

// A single row in the super-admin pharmacies console. Carries live rollup
// counts (branches, pharmacy admins, and total linked users) so the table can
// show tenant size without a second round-trip. Status is intentionally
// omitted for now — the Pharmacy model has no status column yet, so suspend /
// re-activate lives with the (future) pharmacy detail page.
export const pharmacyAdminListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  branchCount: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  userCount: z.number().int().nonnegative(),
  createdAt: dateSchema,
});
export type PharmacyAdminListItem = z.infer<typeof pharmacyAdminListItemSchema>;

// Response from GET /pharmacies/admin — the full list for the console.
export const pharmacyAdminListResponseSchema = z.object({
  pharmacies: z.array(pharmacyAdminListItemSchema),
  total: z.number(),
});
export type PharmacyAdminListResponse = z.infer<
  typeof pharmacyAdminListResponseSchema
>;
