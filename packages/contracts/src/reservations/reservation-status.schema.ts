import { z } from 'zod';

export const reservationStatusSchema = z.enum([
  'ACTIVE',
  'READY_FOR_PICKUP',
  'FULFILLED',
  'EXPIRED',
  'CANCELLED',
]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
