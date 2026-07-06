import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination.schema';

export const expenseQuerySchema = paginationQuerySchema.extend({
  categoryId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
