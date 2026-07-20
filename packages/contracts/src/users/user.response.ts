import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { gymStatusSchema } from '../gyms/gym-status.schema';
import { memberStatusSchema } from '../members/member-status.schema';

// Response from /auth/me endpoint
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  gymId: z.uuid().nullable(),
  isConfirmed: z.boolean(),
  phoneNumber: z.string().nullable(),
  gymStatus: gymStatusSchema.nullable().optional(),
  gymStatusReason: z.string().nullable().optional(),
  memberStatus: memberStatusSchema.nullable().optional(),
  gymThemeColor: z.string().nullable().optional(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
