import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { userStatusSchema } from './user-status.schema';

// Response describing the authenticated user (e.g. from /auth/me).
// `status` lets the web app route PENDING users into the set-password step;
// `pharmacyId`/`branchId` carry the tenant scope used by downstream pages.
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  pharmacyId: z.uuid().nullable(),
  branchId: z.uuid().nullable(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
