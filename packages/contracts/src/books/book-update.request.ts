import { z } from 'zod';
import { bookCreateRequestSchema } from './book-create.request';

// Request for PATCH /books/:id
export const bookUpdateRequestSchema = bookCreateRequestSchema.partial();
export type BookUpdateRequest = z.infer<typeof bookUpdateRequestSchema>;
