import { z } from 'zod';
import { projectScopeSchema } from './project-scope.schema';

export const projectsListQuerySchema = z.strictObject({
  scope: projectScopeSchema.default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProjectsListQuery = z.infer<typeof projectsListQuerySchema>;
