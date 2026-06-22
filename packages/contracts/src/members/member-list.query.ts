import { z } from 'zod';
import { memberStatusSchema } from './member-status.schema';

export const memberListQuerySchema = z.object({
  status: memberStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;
