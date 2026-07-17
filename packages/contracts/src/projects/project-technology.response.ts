import { z } from 'zod';
import { technologySchema } from '../technologies';

export const projectTechnologyResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  technologyId: z.string().uuid(),
  technology: technologySchema,
  source: z.enum(['SCANNER', 'MANUAL', 'BOTH']),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectTechnologyResponse = z.infer<
  typeof projectTechnologyResponseSchema
>;
