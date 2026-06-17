import { z } from 'zod';
import { recurrenceTypeSchema } from '../expenses/recurrence-type.schema';

export const saleCreateRequestSchema = z.object({
  productId: z.uuid().optional(),
  description: z.string().max(500).optional(),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid quantity')
    .default('1'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  unitCost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  recurrence: recurrenceTypeSchema.default('NONE'),
  notes: z.string().max(2000).optional(),
});

export type SaleCreateRequest = z.infer<typeof saleCreateRequestSchema>;
