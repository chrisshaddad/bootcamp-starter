import { z } from 'zod';
import { projectOwnerStatusSchema } from './project-status.schema';
export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().nullable().optional(),
  fullDescription: z.string().nullable().optional(),
  logoUrl: z.literal(null).optional(),

  // Standard type-safe Zod pattern for optional URL inputs that can be empty strings ""
  deploymentUrl: z.string().url().nullable().or(z.literal('')).optional(),
  status: projectOwnerStatusSchema.optional(),
});
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
