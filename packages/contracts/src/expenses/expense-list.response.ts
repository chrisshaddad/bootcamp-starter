import { z } from 'zod';
import { expenseResponseSchema } from './expense.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const expenseListResponseSchema = z.object({
  expenses: z.array(expenseResponseSchema),
  meta: paginatedMetaSchema,
});

export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
