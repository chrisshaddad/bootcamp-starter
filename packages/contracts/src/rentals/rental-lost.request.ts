import { z } from 'zod';

// Request for PATCH /rentals/:id/lost
export const rentalLostRequestSchema = z.object({
  // Defaults to the lost copy's own condition's buyPrice, falling back to a
  // flat fee when that condition has no price row (see RentalsService).
  fineAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount')
    .optional(),
  notes: z.string().optional(),
});
export type RentalLostRequest = z.infer<typeof rentalLostRequestSchema>;
