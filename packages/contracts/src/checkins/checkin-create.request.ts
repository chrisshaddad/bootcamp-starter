import { z } from 'zod';

export const checkInCreateRequestSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export type CheckInCreateRequest = z.infer<typeof checkInCreateRequestSchema>;
