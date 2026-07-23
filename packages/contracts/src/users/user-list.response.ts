import { z } from 'zod';
import { userAccountResponseSchema } from './user-account.response';

// Response from GET /users
export const userListResponseSchema = z.object({
  users: z.array(userAccountResponseSchema),
  total: z.number(),
});

export type UserListResponse = z.infer<typeof userListResponseSchema>;
