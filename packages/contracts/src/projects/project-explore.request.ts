import { z } from 'zod';

const technologyFilterSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return value.split(',').filter(Boolean);
    }
    return value;
  },
  z.array(z.string().trim().min(1).max(100)).max(20).default([]),
);

export const projectsExploreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['latest', 'oldest', 'alphabetical']).default('latest'),
  userId: z.string().optional(),
  technology: technologyFilterSchema,
});

export type ProjectsExploreQuery = z.infer<typeof projectsExploreQuerySchema>;
