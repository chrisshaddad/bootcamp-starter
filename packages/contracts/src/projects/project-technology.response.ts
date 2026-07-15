import { z } from 'zod';

export const projectTechnologyResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  technologyId: z.string().uuid(),
  source: z.enum(['SCANNER', 'MANUAL', 'BOTH']),
  evidence: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  technology: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    category: z.string(),
  }),
});

export type ProjectTechnologyResponse = z.infer<
  typeof projectTechnologyResponseSchema
>;
