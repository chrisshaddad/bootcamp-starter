import { z } from 'zod';
import { bookCopyConditionSchema } from '../book-copies';

export const bookStockRowSchema = z.object({
  condition: bookCopyConditionSchema,
  quantity: z.number().int().min(0),
});

export type BookStockRow = z.infer<typeof bookStockRowSchema>;
