import { z } from 'zod';
import { dateSchema } from '../common';

// A pharmacy branch as shown in the super-admin console. `latitude`/`longitude`
// are stored as DB decimals but travel the wire as plain numbers (the API
// converts them). `userCount` is the live count of staff assigned to the
// branch — the console warns before deleting a branch that still has staff.
export const branchResponseSchema = z.object({
  id: z.uuid(),
  pharmacyId: z.uuid(),
  name: z.string(),
  phoneNumber: z.string().nullable(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  userCount: z.number().int().nonnegative(),
  createdAt: dateSchema,
});
export type BranchResponse = z.infer<typeof branchResponseSchema>;
