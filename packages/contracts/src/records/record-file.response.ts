import { z } from 'zod';
import { dateSchema } from '../common';

// A record attachment. The raw storage URL is never exposed — files are
// streamed through an access-controlled download endpoint by id.
export const recordFileResponseSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  uploadedAt: dateSchema,
});
export type RecordFileResponse = z.infer<typeof recordFileResponseSchema>;
