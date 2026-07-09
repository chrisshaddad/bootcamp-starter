import { z } from 'zod';
import { statsUserItemSchema } from './stats-user-item.response';

export const statsUserListResponseSchema = z.object({
  users: z.array(statsUserItemSchema),
  total: z.number(),
});
export type StatsUserListResponse = z.infer<typeof statsUserListResponseSchema>;
