import { z } from 'zod';

// Request for POST /portal/reservations - a patron placing a hold on their
// own account. memberId is intentionally absent (resolved server-side from
// the session), unlike reservationCreateRequestSchema which is staff-facing
// and lets them pick which member the hold is for.
export const reservationCreateSelfRequestSchema = z.object({
  bookId: z.uuid(),
});
export type ReservationCreateSelfRequest = z.infer<
  typeof reservationCreateSelfRequestSchema
>;
