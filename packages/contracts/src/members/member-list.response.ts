import { z } from 'zod';
import { memberSchema } from './member.response';

export const memberListResponseSchema = z.object({
  members: z.array(memberSchema),
  total: z.number(),
});
export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
