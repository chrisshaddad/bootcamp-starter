import { z } from 'zod';
import { bookCopyConditionSchema } from '../book-copies';

const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount');

// One rate-card row on the way in (create/update). Both prices are
// required together - a row's existence means "this condition is priced,"
// for both renting and buying.
export const bookConditionPriceInputSchema = z.object({
  condition: bookCopyConditionSchema,
  rentPrice: amount,
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
  rentPrice: z.string(),
  buyPrice: z.string(),
});
export type BookConditionPriceResponse = z.infer<
  typeof bookConditionPriceResponseSchema
>;
