import { z } from 'zod';

export const projectsExploreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(['latest', 'oldest', 'alphabetical']).default('latest'),
  userId: z.string().optional(), // Add this line
});

export type ProjectsExploreQuery = z.infer<typeof projectsExploreQuerySchema>;
