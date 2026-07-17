import { z } from 'zod';
import { memberRoleSchema } from './member-role.schema';

export const memberCreateRequestSchema = z.object({
  username: z.string().trim().min(1).max(120),
  role: memberRoleSchema,
  organizationId: z.uuid().optional(),
});
export type MemberCreateRequest = z.infer<typeof memberCreateRequestSchema>;
