import { z } from 'zod';

export const rentalStatusSchema = z.enum([
  'ACTIVE',
  'RETURNED',
  'OVERDUE',
  'LOST',
]);
export type RentalStatus = z.infer<typeof rentalStatusSchema>;
