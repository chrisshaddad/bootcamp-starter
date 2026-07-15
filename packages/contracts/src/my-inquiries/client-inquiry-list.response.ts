import { z } from 'zod';
import { clientInquirySchema } from './client-inquiry.response';
import { inquiryStatusSchema } from '../inquiries/inquiry-status.schema';

// Response from GET /my/inquiries — the caller's own inquiries (scoped to
// clientId server-side), newest activity first, with per-status counts so the
// status tabs stay accurate even while one tab is selected.
export const clientInquiryListResponseSchema = z.object({
  inquiries: z.array(clientInquirySchema),
  total: z.number(),
  counts: z.record(inquiryStatusSchema, z.number()),
});
export type ClientInquiryListResponse = z.infer<
  typeof clientInquiryListResponseSchema
>;
