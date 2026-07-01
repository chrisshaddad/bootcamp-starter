import { z } from 'zod';
import { dateSchema } from '../common';
import { sessionStatusSchema } from '../sessions/session.response';
import { instructorResponseSchema } from '../instructors/instructor.response';
import type { BookingStatus } from '../bookings/booking.response';

/** Allowed booking status values for portal bookings */
const meBookingStatusSchema = z.enum(['BOOKED', 'CHECKED_IN', 'CANCELLED']);

/** Embedded session summary returned inside a member portal booking response */
export const meBookingSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: dateSchema,
  endsAt: dateSchema,
  capacity: z.number().int().positive(),
  status: sessionStatusSchema,
  instructor: instructorResponseSchema.nullable().optional(),
});
export type MeBookingSession = z.infer<typeof meBookingSessionSchema>;

/** Full booking response shape returned by the portal API for a logged-in member */
export const meBookingResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  sessionId: z.string().uuid(),
  memberId: z.string().uuid(),
  status: meBookingStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  session: meBookingSessionSchema,
});
export type MeBookingResponse = z.infer<typeof meBookingResponseSchema>;

/** Paginated list of member bookings returned by the portal API */
export const meBookingListResponseSchema = z.object({
  bookings: z.array(meBookingResponseSchema),
  total: z.number().int().nonnegative(),
});
export type MeBookingListResponse = z.infer<typeof meBookingListResponseSchema>;
