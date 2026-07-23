import { z } from 'zod';
import { dateSchema } from '../common';
import { userRoleSchema } from './user-role.schema';

const userOrganizationSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
});

// A platform user as seen by the SUPER_ADMIN users admin.
export const userSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: userRoleSchema,
  isConfirmed: z.boolean(),
  organizationId: z.uuid().nullable(),
  organization: userOrganizationSummarySchema.nullable(),
  createdAt: dateSchema,
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const userListResponseSchema = z.object({
  users: z.array(userSummarySchema),
  total: z.number().int().nonnegative(),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;
