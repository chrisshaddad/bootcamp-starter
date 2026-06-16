import { z } from 'zod';
import { memberRoleSchema } from './member-role.schema';

export const memberSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: memberRoleSchema,
  organizationId: z.uuid(),
});
export type Member = z.infer<typeof memberSchema>;
