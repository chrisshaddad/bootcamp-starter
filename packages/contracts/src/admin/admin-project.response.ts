import { z } from 'zod';
import { dateSchema, uuidSchema } from '../common';
import { projectStatusSchema } from '../projects';

export const adminProjectResponseSchema = z.strictObject({
  id: uuidSchema,
  title: z.string(),
  slug: z.string(),
  status: projectStatusSchema,
  repositoryFullName: z.string(),
  owner: z.strictObject({
    id: uuidSchema,
    email: z.string().email(),
    displayName: z.string(),
  }),
  memberCount: z.number().int().nonnegative(),
  moderationReason: z.string().nullable(),
  moderatedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  publishedAt: dateSchema.nullable(),
});

export type AdminProjectResponse = z.infer<typeof adminProjectResponseSchema>;
