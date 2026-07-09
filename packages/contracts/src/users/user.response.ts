import { z } from 'zod';
import { roleSchema } from './role.schema';

// Response from /auth/me endpoint
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  phone: z.string(),
  role: roleSchema,
  institutionId: z.uuid(),
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
