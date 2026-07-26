import { z } from 'zod';

export const submitAssignmentRequestSchema = z
  .object({
    contentText: z
      .string()
      .trim()
      .max(10000, 'Submission text cannot exceed 10,000 characters')
      .optional(),

    fileKey: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    const hasText = Boolean(value.contentText?.trim());
    const hasFile = Boolean(value.fileKey?.trim());

    if (!hasText && !hasFile) {
      context.addIssue({
        code: 'custom',
        message: 'Provide a written response or upload a file',
        path: ['contentText'],
      });
    }
  });

export type SubmitAssignmentRequest = z.infer<
  typeof submitAssignmentRequestSchema
>;
