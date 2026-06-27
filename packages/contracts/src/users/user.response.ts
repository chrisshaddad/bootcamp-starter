import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';

// Response from /auth/me endpoint
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
});
export type UserResponse = z.infer<typeof userResponseSchema>;
