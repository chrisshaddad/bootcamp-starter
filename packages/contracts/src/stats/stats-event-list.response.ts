import { z } from 'zod';
import { statsEventItemSchema } from './stats-event-item.response';

export const statsEventListResponseSchema = z.object({
  events: z.array(statsEventItemSchema),
  total: z.number(),
});
export type StatsEventListResponse = z.infer<
  typeof statsEventListResponseSchema
>;
