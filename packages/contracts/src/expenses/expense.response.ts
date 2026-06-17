import { z } from 'zod';
import { recurrenceTypeSchema } from './recurrence-type.schema';
import { expenseCategoryResponseSchema } from '../expense-categories/expense-category.response';

export const expenseResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  categoryId: z.uuid().nullable(),
  createdById: z.uuid(),
  description: z.string(),
  amount: z.string(), // Decimal serialized as string
  date: z.string(),   // ISO date string
  recurrence: recurrenceTypeSchema,
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: expenseCategoryResponseSchema.nullable().optional(),
  createdBy: z
    .object({ id: z.uuid(), name: z.string(), email: z.string() })
    .optional(),
});

export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
