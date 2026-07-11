import { z } from 'zod';

// Request for PATCH /reservations/:id/ready
export const reservationReadyRequestSchema = z.object({
  // The specific copy staff are setting aside for this hold.
  bookCopyId: z.uuid(),
});
export type ReservationReadyRequest = z.infer<
  typeof reservationReadyRequestSchema
>;
