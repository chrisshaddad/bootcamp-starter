import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { gymStatusSchema } from '../gyms/gym-status.schema';

// User profile (optional nested object)
const userProfileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
});

// Response from /auth/me endpoint
export const userResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  gymId: z.uuid().nullable(),
  isConfirmed: z.boolean(),
  profile: userProfileSchema.nullable().optional(),
  gymStatus: gymStatusSchema.nullable().optional(),
  gymStatusReason: z.string().nullable().optional(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
