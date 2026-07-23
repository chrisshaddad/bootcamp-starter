import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';

// Request for PATCH /users/:id/role (SUPER_ADMIN sets a user's platform role).
export const userRoleUpdateRequestSchema = z.object({
  role: userRoleSchema,
});
export type UserRoleUpdateRequest = z.infer<typeof userRoleUpdateRequestSchema>;
