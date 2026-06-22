import { z } from 'zod';
import { memberStatusSchema } from './member-status.schema';
import { dateSchema } from '../common';

export const memberResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  dateOfBirth: dateSchema.nullable(),
  status: memberStatusSchema,
  joinedAt: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type MemberResponse = z.infer<typeof memberResponseSchema>;
