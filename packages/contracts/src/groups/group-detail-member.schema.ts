import { z } from 'zod';
import { memberRoleSchema } from '../members/member-role.schema';

export const groupDetailMemberSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: memberRoleSchema,
});
export type GroupDetailMember = z.infer<typeof groupDetailMemberSchema>;
