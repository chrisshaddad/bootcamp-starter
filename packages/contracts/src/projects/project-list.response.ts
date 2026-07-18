import { z } from 'zod';
import { projectByIdResponseSchema } from './project-by-id.response';

export const projectsListResponseSchema = z.strictObject({
  data: z.array(projectByIdResponseSchema),
  meta: z.strictObject({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ProjectsListResponse = z.infer<typeof projectsListResponseSchema>;
