import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { userStatusSchema } from './user-status.schema';
import { dateSchema } from '../common';

// A single row in the super-admin user list. Carries the tenant scope
// (`pharmacyId`/`branchId`) plus a resolved `pharmacyName` for display so the
// table doesn't have to show raw UUIDs.
const userListItemSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  pharmacyId: z.uuid().nullable(),
  pharmacyName: z.string().nullable(),
  branchId: z.uuid().nullable(),
  createdAt: dateSchema,
});
export type UserListItem = z.infer<typeof userListItemSchema>;

// Response from GET /users (optionally filtered by ?role= and ?status=).
export const userListResponseSchema = z.object({
  users: z.array(userListItemSchema),
  total: z.number(),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;
