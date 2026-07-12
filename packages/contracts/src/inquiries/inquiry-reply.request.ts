import { z } from 'zod';

// Body for POST /inquiries/:id/messages. A non-empty reply from the officer;
// the message is trimmed and length-capped. The sender and inquiry are always
// derived server-side (session actor + path param), never from this body.
export const inquiryReplyRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Enter a reply')
    .max(4000, 'Reply is too long'),
});
export type InquiryReplyRequest = z.infer<typeof inquiryReplyRequestSchema>;
