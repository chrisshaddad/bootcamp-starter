import { z } from 'zod';
import { bookCopyCreateRequestSchema } from './book-copy-create.request';

// Request for PATCH /book-copies/:id
// bookId is intentionally excluded - a copy's barcode is a physical label
// tied to one title, it isn't reassigned to a different book after creation.
export const bookCopyUpdateRequestSchema = bookCopyCreateRequestSchema
  .omit({ bookId: true })
  .partial();
export type BookCopyUpdateRequest = z.infer<typeof bookCopyUpdateRequestSchema>;
