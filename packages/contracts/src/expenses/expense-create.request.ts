import { z } from 'zod';
import { recurrenceTypeSchema } from './recurrence-type.schema';

export const expenseCreateRequestSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  categoryId: z.uuid().optional(),
  recurrence: recurrenceTypeSchema.default('NONE'),
  notes: z.string().max(2000).optional(),
});

export type ExpenseCreateRequest = z.infer<typeof expenseCreateRequestSchema>;
