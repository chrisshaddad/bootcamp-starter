import { z } from 'zod';

// Query params for GET /users. Coerced from strings and bounded so that
// non-numeric values are rejected and result sets stay capped.
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
