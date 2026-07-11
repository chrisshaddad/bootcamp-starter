import { z } from 'zod';
import { bookCopyResponseSchema } from './book-copy.response';

// Response from GET /book-copies
export const bookCopyListResponseSchema = z.object({
  bookCopies: z.array(bookCopyResponseSchema),
  total: z.number(),
});
export type BookCopyListResponse = z.infer<typeof bookCopyListResponseSchema>;
