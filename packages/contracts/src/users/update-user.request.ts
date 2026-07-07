import { z } from 'zod';
import { assignableUserRoleSchema } from './create-user.request';

// Request for PATCH /users/:id
// Email is intentionally not editable here.
export const updateUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: assignableUserRoleSchema.optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
