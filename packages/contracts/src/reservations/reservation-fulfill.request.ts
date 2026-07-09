import { z } from 'zod';

// Request for PATCH /reservations/:id/fulfill
export const reservationFulfillRequestSchema = z.object({
  // Defaults to the standard loan period (see RentalsService) when omitted.
  dueDate: z.coerce.date().optional(),
});
export type ReservationFulfillRequest = z.infer<
  typeof reservationFulfillRequestSchema
>;
