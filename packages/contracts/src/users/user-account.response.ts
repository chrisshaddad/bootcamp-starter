import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { dateSchema } from '../common';

const userOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const userDepartmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const userManagerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

// Shape of a user record as seen by an admin (Super Admin org/user
// management) - distinct from the leaner `UserResponse` used by /auth/me.
export const userAccountResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
  title: z.string().nullable(),
  level: z.number().nullable(),
  createdAt: dateSchema,
  organization: userOrganizationSchema.nullable(),
  department: userDepartmentSchema.nullable(),
  manager: userManagerSchema.nullable(),
});

export type UserAccountResponse = z.infer<typeof userAccountResponseSchema>;
