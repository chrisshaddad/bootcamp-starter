import { z } from 'zod';

export const savedProjectNoteUpdateRequestSchema = z.object({
  note: z.string().max(2000).nullable(),
});

export type SavedProjectNoteUpdateRequest = z.infer<
  typeof savedProjectNoteUpdateRequestSchema
>;
