import { z } from 'zod';
import { groupSchema } from './group.response';

export const groupListResponseSchema = z.object({
  groups: z.array(groupSchema),
  total: z.number(),
});
export type GroupListResponse = z.infer<typeof groupListResponseSchema>;
