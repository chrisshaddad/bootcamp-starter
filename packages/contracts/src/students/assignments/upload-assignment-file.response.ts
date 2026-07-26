import { z } from 'zod';

export const uploadAssignmentFileResponseSchema = z.object({
  fileKey: z.string().min(1),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});

export type UploadAssignmentFileResponse = z.infer<
  typeof uploadAssignmentFileResponseSchema
>;
