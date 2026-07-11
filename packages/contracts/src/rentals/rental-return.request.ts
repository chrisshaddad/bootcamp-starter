import { z } from 'zod';

// Request for PATCH /rentals/:id/return
export const rentalReturnRequestSchema = z.object({
  notes: z.string().optional(),
});
export type RentalReturnRequest = z.infer<typeof rentalReturnRequestSchema>;
