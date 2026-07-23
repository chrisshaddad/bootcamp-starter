import { z } from 'zod';
import { dateSchema } from '../common';
import { bookCopyConditionSchema } from '../book-copies';

const purchaseBookCopySummarySchema = z.object({
  id: z.uuid(),
  condition: bookCopyConditionSchema,
  book: z.object({
    id: z.uuid(),
    title: z.string(),
    coverUrl: z.string().nullable(),
  }),
});

// Response shape for a single Purchase
export const purchaseResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  bookCopyId: z.uuid(),
  memberId: z.uuid(),
  // Prisma Decimal serializes to a string over the wire (see BookResponse).
  price: z.string(),
  purchasedAt: dateSchema,
  createdAt: dateSchema,
  bookCopy: purchaseBookCopySummarySchema,
});
export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;
