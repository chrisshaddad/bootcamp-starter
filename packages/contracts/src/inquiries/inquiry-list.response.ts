import { z } from 'zod';
import { inquiryResponseSchema } from './inquiry.response';
import { inquiryStatusSchema } from './inquiry-status.schema';

// Response from GET /inquiries. `counts` carries the number of inquiries in each
// status across the whole queue (not just the filtered page), so the tab badges
// stay accurate even while one tab is selected. `branchName` labels a
// single-branch (officer) view; it is null for the pharmacy-admin cross-branch
// view, where each row's own `branchName` identifies its branch instead.
export const inquiryListResponseSchema = z.object({
  branchName: z.string().nullable(),
  inquiries: z.array(inquiryResponseSchema),
  total: z.number(),
  counts: z.record(inquiryStatusSchema, z.number()),
});
export type InquiryListResponse = z.infer<typeof inquiryListResponseSchema>;
