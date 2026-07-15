import { z } from 'zod';
import { statsMemberItemSchema } from './stats-member-item.response';

export const statsMemberListResponseSchema = z.object({
  members: z.array(statsMemberItemSchema),
  total: z.number(),
});
export type StatsMemberListResponse = z.infer<
  typeof statsMemberListResponseSchema
>;
