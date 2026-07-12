import { z } from 'zod';
import { roleSchema } from './role.schema';
import { dateSchema } from '../common';

// Response from GET /users/:id and POST/PATCH /users
export const userDetailResponseSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
  institutionId: z.uuid(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>;
