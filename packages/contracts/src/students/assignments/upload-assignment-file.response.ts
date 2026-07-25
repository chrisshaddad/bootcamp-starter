import { z } from 'zod';

export const uploadAssignmentFileResponseSchema = z.object({
  fileUrl: z.string().url(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});

export type UploadAssignmentFileResponse = z.infer<
  typeof uploadAssignmentFileResponseSchema
>;
