import { z } from 'zod';
import { reservationResponseSchema } from './reservation.response';

// Response from GET /reservations
export const reservationListResponseSchema = z.object({
  reservations: z.array(reservationResponseSchema),
  total: z.number(),
});
export type ReservationListResponse = z.infer<
  typeof reservationListResponseSchema
>;
