import { z } from 'zod';

// Request for POST /rentals (checkout)
export const rentalCheckoutRequestSchema = z.object({
  bookCopyId: z.uuid(),
  memberId: z.uuid(),
  // Defaults to a standard loan period (see RentalsService) when omitted.
  dueDate: z.coerce.date().optional(),
});
export type RentalCheckoutRequest = z.infer<typeof rentalCheckoutRequestSchema>;
