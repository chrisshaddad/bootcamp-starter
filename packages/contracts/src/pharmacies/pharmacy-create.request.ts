import { z } from 'zod';
import { branchCreateRequestSchema } from '../branches';

// Body for POST /pharmacies. Registers a pharmacy and, in the same step,
// invites its first pharmacy admin: the server creates a PENDING PHARMACY_ADMIN
// user scoped to the new pharmacy. That account has no password — the admin
// completes onboarding through the magic-link / set-password flow, same as
// every other invited staff account.
//
// `branch` is optional: not every pharmacy opens with a branch. When present,
// the pharmacy's first branch is created in the same transaction.
export const pharmacyCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Pharmacy name is required').max(150),
  adminFirstName: z.string().trim().min(1, 'First name is required').max(100),
  adminLastName: z.string().trim().min(1, 'Last name is required').max(100),
  adminEmail: z.email('Enter a valid email'),
  branch: branchCreateRequestSchema.optional().nullable(),
});
export type PharmacyCreateRequest = z.infer<typeof pharmacyCreateRequestSchema>;
