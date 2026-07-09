import { z } from 'zod';

// Request for PATCH /rentals/:id/lost
export const rentalLostRequestSchema = z.object({
  // Defaults to the book's salePrice, falling back to a flat fee, when
  // omitted (see RentalsService).
  fineAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount')
    .optional(),
  notes: z.string().optional(),
});
export type RentalLostRequest = z.infer<typeof rentalLostRequestSchema>;
