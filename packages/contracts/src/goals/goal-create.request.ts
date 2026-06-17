import { z } from 'zod';
import { goalTypeSchema, goalPeriodSchema } from './goal.response';

export const goalCreateRequestSchema = z.object({
  type: goalTypeSchema,
  period: goalPeriodSchema,
  targetAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
});

export type GoalCreateRequest = z.infer<typeof goalCreateRequestSchema>;
