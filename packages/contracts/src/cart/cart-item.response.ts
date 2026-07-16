import { z } from 'zod';
import { dateSchema } from '../common';
import { bookCopyConditionSchema } from '../book-copies';

const cartItemBookSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  // Prisma Decimal serializes to a string over the wire (see BookResponse).
  salePrice: z.string().nullable(),
});

// Response shape for a single CartItem
export const cartItemResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  cartId: z.uuid(),
  bookId: z.uuid(),
  preferredCondition: bookCopyConditionSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  book: cartItemBookSummarySchema,
});
export type CartItemResponse = z.infer<typeof cartItemResponseSchema>;
