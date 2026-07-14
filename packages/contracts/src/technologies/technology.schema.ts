import { z } from 'zod';

export const technologySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.enum([
    'LANGUAGE',
    'FRAMEWORK',
    'LIBRARY',
    'DATABASE',
    'CLOUD',
    'DEVOPS',
    'TOOL',
    'OTHER',
  ]),
});

export const technologyExploreQuerySchema = z.object({
  search: z.string().optional(),
  category: technologySchema.shape.category.optional(),
});

export type TechnologyResponse = z.infer<typeof technologySchema>;
export type TechnologyExploreQuery = z.infer<
  typeof technologyExploreQuerySchema
>;
