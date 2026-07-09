import { z } from 'zod';
import { dateSchema } from '../common';
import { branchResponseSchema } from '../branches';
import { userRoleSchema, userStatusSchema } from '../users';

// A user as shown on the pharmacy detail page — the staff (and admins) that
// belong to this pharmacy, with their branch resolved to a name for display.
export const pharmacyUserSummarySchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  role: userRoleSchema,
  status: userStatusSchema,
  branchId: z.uuid().nullable(),
  branchName: z.string().nullable(),
  createdAt: dateSchema,
});
export type PharmacyUserSummary = z.infer<typeof pharmacyUserSummarySchema>;

// Response from GET /pharmacies/:id — one pharmacy with its branches and users.
export const pharmacyDetailResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: dateSchema,
  branchCount: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  userCount: z.number().int().nonnegative(),
  branches: z.array(branchResponseSchema),
  users: z.array(pharmacyUserSummarySchema),
});
export type PharmacyDetailResponse = z.infer<
  typeof pharmacyDetailResponseSchema
>;
