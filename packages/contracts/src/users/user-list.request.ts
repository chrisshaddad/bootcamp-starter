import { z } from 'zod';
import { staffRoleSchema } from './staff-role.schema';
import { paginationQuerySchema } from '../common/pagination';

// Query params for GET /users
export const userListQuerySchema = z.object({
  role: staffRoleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
  ...paginationQuerySchema.shape,
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
