import { z } from 'zod';
import { memberRoleSchema } from './member-role.schema';

export const memberInviteRequestSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  username: z.string().trim().min(1).max(120),
  role: memberRoleSchema,
  organizationId: z.uuid().optional(),
});
export type MemberInviteRequest = z.infer<typeof memberInviteRequestSchema>;
