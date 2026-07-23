import { z } from 'zod';

// Response for POST /uploads/image
export const imageUploadResponseSchema = z.object({
  url: z.string(),
});
export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>;
