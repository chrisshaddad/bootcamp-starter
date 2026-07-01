import { z } from 'zod';
import { dateSchema } from '../common';
import { memberResponseSchema } from '../members/member.response';

export const checkInResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  memberId: z.string().uuid(),
  checkedInAt: dateSchema,
  checkedOutAt: dateSchema.nullable(),
  updatedAt: dateSchema,
  member: memberResponseSchema.optional(),
});

export type CheckInResponse = z.infer<typeof checkInResponseSchema>;
