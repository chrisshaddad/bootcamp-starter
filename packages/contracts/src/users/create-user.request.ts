import { z } from 'zod';

// Roles a creator (Org Admin or Receptionist) is allowed to assign.
// SUPER_ADMIN can never be assigned through this endpoint.
export const assignableUserRoleSchema = z.enum([
  'ORG_ADMIN',
  'RECEPTIONIST',
  'MEMBER',
]);
export type AssignableUserRole = z.infer<typeof assignableUserRoleSchema>;

// Request for POST /users
// organizationId is intentionally NOT part of this schema - it is always
// derived from the authenticated creator's session on the backend.
export const createUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email().transform((email) => email.toLowerCase().trim()),
  role: assignableUserRoleSchema,
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
