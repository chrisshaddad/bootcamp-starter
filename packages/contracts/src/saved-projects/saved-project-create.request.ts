import { z } from 'zod';

export const savedProjectCreateRequestSchema = z.object({
  projectId: z.string(),
  note: z.string().max(2000).optional(),
});

export type SavedProjectCreateRequest = z.infer<
  typeof savedProjectCreateRequestSchema
>;
