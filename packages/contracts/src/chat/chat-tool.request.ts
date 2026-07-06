import { z } from 'zod';
import { expenseQuerySchema } from '../expenses/expense-query.request';
import { saleQuerySchema } from '../sales/sale-query.request';

// Input schemas for the AI chat's data-retrieval tools. The model fills these,
// so every numeric/boolean value is coerced (it may pass strings) and result
// limits are clamped so a single tool call can never pull an unbounded set into
// the model's context.

export const topNExpensesToolInputSchema = expenseQuerySchema
  .pick({ categoryId: true, dateFrom: true, dateTo: true, search: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(10).default(10),
  });
export type TopNExpensesToolInput = z.infer<typeof topNExpensesToolInputSchema>;

export const listSalesToolInputSchema = saleQuerySchema
  .pick({ productId: true, dateFrom: true, dateTo: true, search: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(20).default(20),
  });
export type ListSalesToolInput = z.infer<typeof listSalesToolInputSchema>;

export const listProductsToolInputSchema = z.object({
  activeOnly: z.coerce
    .boolean()
    .default(false)
    .describe('Only include products currently marked active.'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListProductsToolInput = z.infer<typeof listProductsToolInputSchema>;

export const listGoalsToolInputSchema = z.object({
  activeOnly: z.coerce
    .boolean()
    .default(true)
    .describe('Only include goals that are currently active.'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListGoalsToolInput = z.infer<typeof listGoalsToolInputSchema>;
