import { z } from 'zod';
import { staffRoleSchema } from './staff-role.schema';

// Query params for GET /users
export const userListQuerySchema = z.object({
  role: staffRoleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
