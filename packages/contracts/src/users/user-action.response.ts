import { z } from 'zod';
import { userListItemSchema } from './user-list.response';

// Response from POST /users and PATCH /users/:id
export const userActionResponseSchema = z.object({
  user: userListItemSchema,
});
export type UserActionResponse = z.infer<typeof userActionResponseSchema>;
