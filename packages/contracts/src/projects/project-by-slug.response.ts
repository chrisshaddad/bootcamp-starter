import { z } from 'zod';
import { projectResponseSchema } from './project.response';
import { technologySchema } from '../technologies/technology.schema';
import { projectMemberResponseSchema } from './project-member.response';

export const publicProjectMediaResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  mediaType: z.enum(['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM']),
  publicUrl: z.string().url(),
  caption: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicProjectMediaResponse = z.infer<
  typeof publicProjectMediaResponseSchema
>;

export const publicProjectTechnologyResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  technologyId: z.string().uuid(),
  source: z.enum(['SCANNER', 'MANUAL', 'BOTH']),
  evidence: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  technology: technologySchema,
});

export type PublicProjectTechnologyResponse = z.infer<
  typeof publicProjectTechnologyResponseSchema
>;

export const projectBySlugResponseSchema = projectResponseSchema.extend({
  media: z.array(publicProjectMediaResponseSchema),
  technologies: z.array(publicProjectTechnologyResponseSchema).default([]),
  members: z.array(projectMemberResponseSchema).default([]),
});

export type ProjectBySlugResponse = z.infer<typeof projectBySlugResponseSchema>;
