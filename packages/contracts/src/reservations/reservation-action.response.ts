import { z } from 'zod';
import { reservationResponseSchema } from './reservation.response';

// Response from the ready/fulfill/cancel action endpoints
export const reservationActionResponseSchema = z.object({
  message: z.string(),
  reservation: reservationResponseSchema,
});
export type ReservationActionResponse = z.infer<
  typeof reservationActionResponseSchema
>;
