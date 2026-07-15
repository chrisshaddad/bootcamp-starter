import { z } from 'zod';

// Body for POST /my/inquiries — a client asks a pharmacy about a medicine. The
// pharmacy is derived from the branch server-side (never sent), and the branch
// is re-validated to actually stock the medicine before the inquiry is created.
// `clientId` always comes from the session.
export const clientInquiryCreateRequestSchema = z.object({
  medicineId: z.uuid(),
  branchId: z.uuid(),
  message: z
    .string()
    .trim()
    .min(1, 'Please write a message')
    .max(2000, 'Message is too long'),
});
export type ClientInquiryCreateRequest = z.infer<
  typeof clientInquiryCreateRequestSchema
>;
