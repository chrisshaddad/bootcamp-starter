import { z } from 'zod';
import { publicUserResponseSchema } from './user-public.response';
export const exploreUsersResponseSchema = z.object({
  data: z.array(publicUserResponseSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});
export type ExploreUsersResponse = z.infer<typeof exploreUsersResponseSchema>;
