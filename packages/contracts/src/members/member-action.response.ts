import { z } from 'zod';
import { memberSchema } from './member.response';

export const memberActionResponseSchema = z.object({
  member: memberSchema,
});
export type MemberActionResponse = z.infer<typeof memberActionResponseSchema>;
