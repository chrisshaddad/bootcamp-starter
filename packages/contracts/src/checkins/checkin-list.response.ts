import { z } from 'zod';
import { checkInResponseSchema } from './checkin.response';

export const checkInListResponseSchema = z.object({
  checkIns: z.array(checkInResponseSchema),
  total: z.number().int().nonnegative(),
});

export type CheckInListResponse = z.infer<typeof checkInListResponseSchema>;
