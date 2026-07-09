import { z } from 'zod';
import { bookCopyStatusSchema } from './book-copy-status.schema';
import { bookCopyConditionSchema } from './book-copy-condition.schema';

// Request for POST /book-copies
export const bookCopyCreateRequestSchema = z.object({
  bookId: z.uuid(),
  barcode: z.string().min(1, 'Barcode is required'),
  status: bookCopyStatusSchema.optional(),
  condition: bookCopyConditionSchema.optional(),
  acquiredAt: z.coerce.date().optional(),
});
export type BookCopyCreateRequest = z.infer<typeof bookCopyCreateRequestSchema>;
