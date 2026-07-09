import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { dateSchema } from '../common';

// User list item (within a single organization)
export const userListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  isConfirmed: z.boolean(),
  createdAt: dateSchema,
});
export type UserListItem = z.infer<typeof userListItemSchema>;

// Response from GET /users
export const userListResponseSchema = z.object({
  users: z.array(userListItemSchema),
  total: z.number(),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;
