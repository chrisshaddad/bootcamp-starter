import { z } from 'zod';
import { goalCreateRequestSchema } from './goal-create.request';

export const goalUpdateRequestSchema = goalCreateRequestSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export type GoalUpdateRequest = z.infer<typeof goalUpdateRequestSchema>;
