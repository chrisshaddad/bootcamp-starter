import { z } from 'zod';

export const projectMediaUploadSchema = z.object({
  mediaType: z
    .enum(['IMAGE', 'VIDEO', 'GIF', 'ARCHITECTURE_DIAGRAM'])
    .default('IMAGE'),
  caption: z.string().optional(),
  // Multipart form data fields come as strings, so we coerce the number
  sortOrder: z.coerce.number().int().optional().default(0),
});

export type ProjectMediaUploadRequest = z.infer<
  typeof projectMediaUploadSchema
>;

export const projectMediaUpdateSchema = z.object({
  caption: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export type ProjectMediaUpdateRequest = z.infer<
  typeof projectMediaUpdateSchema
>;
