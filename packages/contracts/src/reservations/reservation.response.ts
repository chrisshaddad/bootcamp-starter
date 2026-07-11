import { z } from 'zod';
import { dateSchema } from '../common';
import { reservationStatusSchema } from './reservation-status.schema';

const reservationBookSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

const reservationMemberSummarySchema = z.object({
  id: z.uuid(),
  libraryCardNumber: z.string(),
});

// Response shape for a single Reservation
export const reservationResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  bookId: z.uuid(),
  memberId: z.uuid(),
  reservedAt: dateSchema,
  expiresAt: dateSchema.nullable(),
  status: reservationStatusSchema,
  notifiedAt: dateSchema.nullable(),
  fulfilledAt: dateSchema.nullable(),
  cancelledAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  book: reservationBookSummarySchema,
  member: reservationMemberSummarySchema,
});
export type ReservationResponse = z.infer<typeof reservationResponseSchema>;
