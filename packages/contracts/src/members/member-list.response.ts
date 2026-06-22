import { z } from 'zod';
import { memberResponseSchema } from './member.response';

export const memberListResponseSchema = z.object({
  members: z.array(memberResponseSchema),
  total: z.number().int().nonnegative(),
});
export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
