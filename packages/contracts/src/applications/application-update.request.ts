import { z } from 'zod';
import { applicationStatusSchema } from './application-status.schema';

export const applicationUpdateRequestSchema = z.object({
  status: applicationStatusSchema.optional(),
  reviewerNotes: z.string().max(5000).optional(),
  managerApproved: z.boolean().optional(),
});

export type ApplicationUpdateRequest = z.infer<
  typeof applicationUpdateRequestSchema
>;
