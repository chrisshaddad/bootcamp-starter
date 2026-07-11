import { z } from 'zod';
import { categoryResponseSchema } from './category.response';

// Response from GET /categories
export const categoryListResponseSchema = z.object({
  categories: z.array(categoryResponseSchema),
  total: z.number(),
});
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
