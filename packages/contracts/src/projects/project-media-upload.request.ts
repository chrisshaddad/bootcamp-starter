import { z } from 'zod';

export const projectMediaUploadSchema = z.object({
  mediaType: z.enum(['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM']).default('IMAGE'),
  caption: z.string().optional(),
  // Multipart form data fields come as strings, so we coerce to a number
  sortOrder: z.coerce.number().int().optional().default(0),
});

export type ProjectMediaUploadRequest = z.infer<
  typeof projectMediaUploadSchema
>;
