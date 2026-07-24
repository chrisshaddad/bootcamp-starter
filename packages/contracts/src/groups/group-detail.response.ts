import { z } from 'zod';
import { groupSchema } from './group.response';
import { groupDetailMemberSchema } from './group-detail-member.schema';

export const groupDetailResponseSchema = groupSchema.extend({
  members: z.array(groupDetailMemberSchema),
});
export type GroupDetailResponse = z.infer<typeof groupDetailResponseSchema>;
