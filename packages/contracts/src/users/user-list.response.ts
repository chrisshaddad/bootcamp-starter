import { z } from 'zod';
import { roleSchema } from './role.schema';
import { dateSchema } from '../common';

export const userListItemSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: dateSchema,
});
export type UserListItem = z.infer<typeof userListItemSchema>;

// Response from GET /users
export const userListResponseSchema = z.object({
  users: z.array(userListItemSchema),
  total: z.number(),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;
