import { z } from 'zod';

export const usersExploreQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['newest', 'oldest', 'alphabetical']).default('newest'),
});

export type UsersExploreQuery = z.infer<typeof usersExploreQuerySchema>;
