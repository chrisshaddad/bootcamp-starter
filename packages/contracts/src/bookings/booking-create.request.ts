import { z } from 'zod';

/** Request schema for creating a booking (registering a member to a session) */
export const bookingCreateRequestSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  memberId: z.string().uuid('Member ID must be a valid UUID'),
});
export type BookingCreateRequest = z.infer<typeof bookingCreateRequestSchema>;
