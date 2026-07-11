import { z } from 'zod';
import { rentalResponseSchema } from './rental.response';

// Response from GET /rentals
export const rentalListResponseSchema = z.object({
  rentals: z.array(rentalResponseSchema),
  total: z.number(),
});
export type RentalListResponse = z.infer<typeof rentalListResponseSchema>;
