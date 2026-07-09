import { z } from 'zod';
import { rentalResponseSchema } from './rental.response';

// Response from the return/lost/pay-fine action endpoints
export const rentalActionResponseSchema = z.object({
  message: z.string(),
  rental: rentalResponseSchema,
});
export type RentalActionResponse = z.infer<typeof rentalActionResponseSchema>;
