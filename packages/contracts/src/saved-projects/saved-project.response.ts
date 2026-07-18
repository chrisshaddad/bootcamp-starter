import { z } from 'zod';
import { dateSchema } from '../common';

export const savedProjectResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  savedByUserId: z.string(),
  note: z.string().nullable(),
  createdAt: dateSchema,
});

export type SavedProjectResponse = z.infer<typeof savedProjectResponseSchema>;
