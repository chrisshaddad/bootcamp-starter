import { z } from 'zod';
import { bookCopyConditionSchema } from '../book-copies';

// Request for POST /portal/cart/items
export const cartAddItemRequestSchema = z.object({
  bookId: z.uuid(),
  preferredCondition: bookCopyConditionSchema.optional(),
});
export type CartAddItemRequest = z.infer<typeof cartAddItemRequestSchema>;
