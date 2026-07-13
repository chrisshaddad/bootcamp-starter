import { z } from 'zod';
import { publicProjectResponseSchema } from './project-public.response';

export const exploreProjectsResponseSchema = z.object({
  data: z.array(publicProjectResponseSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ExploreProjectsResponse = z.infer<
  typeof exploreProjectsResponseSchema
>;
