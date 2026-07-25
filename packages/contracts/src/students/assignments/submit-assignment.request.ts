import { z } from 'zod';

export const submitAssignmentRequestSchema = z
  .object({
    contentText: z
      .string()
      .trim()
      .max(10000, 'Submission text cannot exceed 10,000 characters')
      .optional(),

    fileUrl: z.string().trim().url('File URL must be a valid URL').optional(),
  })
  .superRefine((value, context) => {
    const hasText = Boolean(value.contentText?.trim());
    const hasFile = Boolean(value.fileUrl?.trim());

    if (!hasText && !hasFile) {
      context.addIssue({
        code: 'custom',
        message: 'Provide a written response or a file URL',
        path: ['contentText'],
      });
    }
  });

export type SubmitAssignmentRequest = z.infer<
  typeof submitAssignmentRequestSchema
>;
