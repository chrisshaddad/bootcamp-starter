import { z } from 'zod';
import { technologySchema } from './technology.schema';

export const technologyExploreQuerySchema = z.object({
  search: z.string().optional(),
  category: technologySchema.shape.category.optional(),
});

export type TechnologyExploreQuery = z.infer<
  typeof technologyExploreQuerySchema
>;
