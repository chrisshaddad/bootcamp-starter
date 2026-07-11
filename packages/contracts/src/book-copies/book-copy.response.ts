import { z } from 'zod';
import { dateSchema } from '../common';
import { bookCopyStatusSchema } from './book-copy-status.schema';
import { bookCopyConditionSchema } from './book-copy-condition.schema';

const bookCopyBookSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

// Response shape for a single BookCopy
export const bookCopyResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  bookId: z.uuid(),
  barcode: z.string(),
  status: bookCopyStatusSchema,
  condition: bookCopyConditionSchema,
  acquiredAt: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  book: bookCopyBookSummarySchema,
});
export type BookCopyResponse = z.infer<typeof bookCopyResponseSchema>;
