import { z } from 'zod';
import { bookCreateRequestSchema } from './book-create.request';

// Request for PATCH /books/:id
// addCopies is additive here too (tops up stock) - it never removes or
// replaces copies, which stays a per-barcode action on the book-copies
// management UI.
export const bookUpdateRequestSchema = bookCreateRequestSchema.partial();
export type BookUpdateRequest = z.infer<typeof bookUpdateRequestSchema>;
