import { z } from 'zod';
import { assignableUserRoleSchema } from './assignable-user-role.schema';

// Request for PATCH /users/:id
// Email is intentionally not editable here.
// Note: the "at least one field must be provided" rule lives in the service,
// not here — contracts describe shape only.
export const updateUserRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  role: assignableUserRoleSchema.optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
