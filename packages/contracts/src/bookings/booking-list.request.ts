import { z } from 'zod';

export const bookingListRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export type BookingListRequest = z.infer<typeof bookingListRequestSchema>;
