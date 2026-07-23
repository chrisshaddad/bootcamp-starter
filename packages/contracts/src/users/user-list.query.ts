import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';

export const userListQuerySchema = z.object({
  organizationId: z.uuid().optional(),
  role: userRoleSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
