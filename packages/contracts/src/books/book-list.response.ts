import { z } from 'zod';
import { bookResponseSchema } from './book.response';

// Response from GET /books
export const bookListResponseSchema = z.object({
  books: z.array(bookResponseSchema),
  total: z.number(),
});
export type BookListResponse = z.infer<typeof bookListResponseSchema>;
