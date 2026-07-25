import { z } from 'zod';
import { bookCopyConditionSchema } from '../book-copies';

const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount');

// One rate-card row on the way in (create/update). A row's existence means
// "this book is for sale in this condition" — borrowing is free (patrons only
// pay fines), so there's only a buy price.
export const bookConditionPriceInputSchema = z.object({
  condition: bookCopyConditionSchema,
  buyPrice: amount,
});
export type BookConditionPriceInput = z.infer<
  typeof bookConditionPriceInputSchema
>;

// One rate-card row on the way out. Prisma Decimal serializes to a string
// over the wire (see BookResponse).
export const bookConditionPriceResponseSchema = z.object({
  id: z.uuid(),
  condition: bookCopyConditionSchema,
  buyPrice: z.string(),
});
export type BookConditionPriceResponse = z.infer<
  typeof bookConditionPriceResponseSchema
>;
