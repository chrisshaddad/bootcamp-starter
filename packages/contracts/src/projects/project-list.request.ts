import { z } from 'zod';

export const projectsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProjectsListQuery = z.infer<typeof projectsListQuerySchema>;

export const projectsExploreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z
    .enum(['newest', 'oldest', 'alphabetical'])
    .optional()
    .default('newest'),
});

export type ProjectsExploreQuery = z.infer<typeof projectsExploreQuerySchema>;
