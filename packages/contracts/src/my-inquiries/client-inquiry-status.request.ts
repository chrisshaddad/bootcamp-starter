import { z } from 'zod';

// Body for PATCH /my/inquiries/:id/status. A client may only close their own
// inquiry or reopen a closed one — never set PENDING/IN_PROGRESS/ANSWERED
// arbitrarily (those are officer-driven). Reopening maps to PENDING.
export const clientInquiryStatusRequestSchema = z.object({
  status: z.enum(['CLOSED', 'PENDING']),
});
export type ClientInquiryStatusRequest = z.infer<
  typeof clientInquiryStatusRequestSchema
>;
