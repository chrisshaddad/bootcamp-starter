import { z } from 'zod';
import { assignableUserRoleSchema } from './assignable-user-role.schema';

// Request for POST /users
// organizationId is intentionally NOT part of this schema - it is always
// derived from the authenticated creator's session on the backend.
export const createUserRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email().transform((email) => email.toLowerCase().trim()),
  role: assignableUserRoleSchema,
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
