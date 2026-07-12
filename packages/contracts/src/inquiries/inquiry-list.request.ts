import { z } from 'zod';
import { inquiryStatusSchema } from './inquiry-status.schema';

// Query params for GET /inquiries. `status` narrows the queue to one tab; omit
// it for every inquiry. The server always scopes the result to the caller's own
// pharmacy + branch regardless of this filter.
export const inquiryListQuerySchema = z.object({
  status: inquiryStatusSchema.optional(),
});
export type InquiryListQuery = z.infer<typeof inquiryListQuerySchema>;
