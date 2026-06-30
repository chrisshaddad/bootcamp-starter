import { z } from 'zod';
import { dateSchema } from '../common';

/** Allowed booking status values */
export const bookingStatusSchema = z.enum([
  'BOOKED',
  'CHECKED_IN',
  'CANCELLED',
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Embedded member summary returned inside a booking response */
export const bookingMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

/** Full booking response shape returned by the API */
export const bookingResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  sessionId: z.string().uuid(),
  memberId: z.string().uuid(),
  status: bookingStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  member: bookingMemberSchema,
});
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
