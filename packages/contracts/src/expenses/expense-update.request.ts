import { z } from 'zod';
import { expenseCreateRequestSchema } from './expense-create.request';

export const expenseUpdateRequestSchema = expenseCreateRequestSchema.partial();

export type ExpenseUpdateRequest = z.infer<typeof expenseUpdateRequestSchema>;
