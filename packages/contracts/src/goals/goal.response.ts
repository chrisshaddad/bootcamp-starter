import { z } from 'zod';

export const goalTypeSchema = z.enum([
  'REVENUE',
  'GROSS_PROFIT',
  'NET_PROFIT',
  'EXPENSE_LIMIT',
]);

export const goalPeriodSchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']);

export const goalResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  createdById: z.uuid(),
  type: goalTypeSchema,
  period: goalPeriodSchema,
  targetAmount: z.string(), // Decimal as string
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Computed progress (included when ?includeProgress=true)
  currentAmount: z.string().optional(),
  progressPct: z.number().optional(),
});

export type GoalType = z.infer<typeof goalTypeSchema>;
export type GoalPeriod = z.infer<typeof goalPeriodSchema>;
export type GoalResponse = z.infer<typeof goalResponseSchema>;
