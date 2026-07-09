import { z } from 'zod';

// Request for POST /reservations (place a hold)
export const reservationCreateRequestSchema = z.object({
  bookId: z.uuid(),
  memberId: z.uuid(),
  expiresAt: z.coerce.date().optional(),
});
export type ReservationCreateRequest = z.infer<
  typeof reservationCreateRequestSchema
>;
