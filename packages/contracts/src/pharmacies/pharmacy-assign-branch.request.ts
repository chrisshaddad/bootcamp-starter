import { z } from 'zod';

// Body for PATCH /pharmacies/:id/users/:userId/branch — assign (or clear) the
// branch of a user within a pharmacy. `null` unassigns the user from any branch
// while keeping them in the pharmacy. The server verifies both the user and the
// branch belong to the pharmacy before applying the change.
export const pharmacyAssignBranchRequestSchema = z.object({
  branchId: z.uuid().nullable(),
});
export type PharmacyAssignBranchRequest = z.infer<
  typeof pharmacyAssignBranchRequestSchema
>;
