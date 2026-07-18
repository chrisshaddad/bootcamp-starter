import { z } from 'zod';
import { projectResponseSchema } from './project.response';
import { projectTechnologyResponseSchema } from './project-technology.response';
import { projectMemberResponseSchema } from './project-member.response';
import { projectAccessResponseSchema } from './project-access.response';
import { dateSchema, uuidSchema } from '../common';

export const projectMediaResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  uploadedByUserId: uuidSchema,
  mediaType: z.enum(['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM']),
  storageKey: z.string(),
  publicUrl: z.string().url(),
  caption: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type ProjectMediaResponse = z.infer<typeof projectMediaResponseSchema>;

export const projectByIdResponseSchema = projectResponseSchema.extend({
  repositoryUrl: z.string().url(),
  access: projectAccessResponseSchema,
  media: z.array(projectMediaResponseSchema),
  technologies: z.array(projectTechnologyResponseSchema).default([]),
  members: z.array(projectMemberResponseSchema).default([]),
});

export type ProjectByIdResponse = z.infer<typeof projectByIdResponseSchema>;
