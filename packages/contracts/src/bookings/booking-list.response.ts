import { z } from 'zod';
import { bookingResponseSchema } from './booking.response';

/** Array of booking responses returned by the list endpoint */
export const bookingListResponseSchema = z.array(bookingResponseSchema);
export type BookingListResponse = z.infer<typeof bookingListResponseSchema>;
