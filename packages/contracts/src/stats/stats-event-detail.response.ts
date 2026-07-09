import { z } from 'zod';
import { statsEventItemSchema } from './stats-event-item.response';

export const statsEventDetailResponseSchema = statsEventItemSchema;
export type StatsEventDetailResponse = z.infer<
  typeof statsEventDetailResponseSchema
>;
