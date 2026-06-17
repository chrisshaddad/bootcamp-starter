import { z } from 'zod';
import { goalResponseSchema } from './goal.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const goalListResponseSchema = z.object({
  goals: z.array(goalResponseSchema),
  meta: paginatedMetaSchema,
});

export type GoalListResponse = z.infer<typeof goalListResponseSchema>;
