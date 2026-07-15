import { z } from 'zod';
import { technologySchema } from '../technologies/technology.schema';

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
  technology: technologySchema, // Reuses shared technology schema directly
});

export type ProjectTechnologyResponse = z.infer<
  typeof projectTechnologyResponseSchema
>;
