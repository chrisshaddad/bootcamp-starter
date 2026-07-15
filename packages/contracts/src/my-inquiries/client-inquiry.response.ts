import { z } from 'zod';
import { inquiryStatusSchema } from '../inquiries/inquiry-status.schema';
import { senderTypeSchema } from '../inquiries/inquiry-sender.schema';
import { dateSchema } from '../common';

// One row in a client's own inquiry list. Unlike the staff queue (single
// pharmacy), a client spans pharmacies, so each row names its pharmacy + branch.
// `lastMessageSenderType` lets the UI flag threads the pharmacy answered last
// (i.e. a reply the client hasn't opened) — the client-side mirror of the
// officer's "awaiting reply" bell.
export const clientInquirySchema = z.object({
  id: z.uuid(),
  pharmacyName: z.string(),
  branchName: z.string(),
  medicineId: z.uuid(),
  medicineName: z.string(),
  status: inquiryStatusSchema,
  messageCount: z.number().int().nonnegative(),
  lastUpdatedAt: dateSchema,
  lastMessageAt: dateSchema.nullable(),
  lastMessageSenderType: senderTypeSchema.nullable(),
  createdAt: dateSchema,
});
export type ClientInquiry = z.infer<typeof clientInquirySchema>;
