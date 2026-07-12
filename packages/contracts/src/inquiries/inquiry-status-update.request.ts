import { z } from 'zod';
import { inquiryStatusSchema } from './inquiry-status.schema';

// Body for PATCH /inquiries/:id/status. The officer moves the inquiry to any of
// the four lifecycle states directly.
export const inquiryStatusUpdateRequestSchema = z.object({
  status: inquiryStatusSchema,
});
export type InquiryStatusUpdateRequest = z.infer<
  typeof inquiryStatusUpdateRequestSchema
>;
