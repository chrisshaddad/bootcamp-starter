import { z } from 'zod';

export const expenseCategoryCreateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .default('#6366f1'),
});

export type ExpenseCategoryCreateRequest = z.infer<
  typeof expenseCategoryCreateRequestSchema
>;
