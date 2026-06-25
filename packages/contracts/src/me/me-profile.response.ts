import { z } from 'zod';
import { dateSchema } from '../common';
import { memberStatusSchema } from '../members/member-status.schema';

export const meProfileResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: dateSchema.nullable(),
  status: memberStatusSchema,
  joinedAt: dateSchema,
});
export type MeProfileResponse = z.infer<typeof meProfileResponseSchema>;
