import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { userStatusSchema } from './user-status.schema';

// Query params for GET /users. Both filters are optional; omitting them
// returns every user. Values are validated against the shared role/status
// enums so an unknown filter is rejected before hitting the database.
export const userListQuerySchema = z.object({
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
