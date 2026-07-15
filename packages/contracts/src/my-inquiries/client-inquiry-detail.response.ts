import { z } from 'zod';
import { inquiryStatusSchema } from '../inquiries/inquiry-status.schema';
import { inquiryMessageResponseSchema } from '../inquiries/inquiry-message.response';
import { medicineResponseSchema } from '../medicines';
import { dateSchema } from '../common';

// Response from GET /my/inquiries/:id — one of the caller's own inquiries: the
// full conversation plus context (which pharmacy/branch it's with and the
// medicine it's about). Scoped to the caller server-side; a miss is a 404.
export const clientInquiryDetailResponseSchema = z.object({
  id: z.uuid(),
  status: inquiryStatusSchema,
  pharmacyName: z.string(),
  branchName: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  medicine: medicineResponseSchema,
  messages: z.array(inquiryMessageResponseSchema),
});
export type ClientInquiryDetailResponse = z.infer<
  typeof clientInquiryDetailResponseSchema
>;
