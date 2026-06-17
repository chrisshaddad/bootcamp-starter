import { z } from 'zod';

export const expenseCategoryResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExpenseCategoryResponse = z.infer<
  typeof expenseCategoryResponseSchema
>;
