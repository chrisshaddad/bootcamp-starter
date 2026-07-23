import { z } from 'zod';
import { bookCopyConditionSchema } from '../book-copies';

// Request for POST /reservations (place a hold)
export const reservationCreateRequestSchema = z.object({
  bookId: z.uuid(),
  memberId: z.uuid(),
  expiresAt: z.coerce.date().optional(),
  preferredCondition: bookCopyConditionSchema.optional(),
});
export type ReservationCreateRequest = z.infer<
  typeof reservationCreateRequestSchema
>;
