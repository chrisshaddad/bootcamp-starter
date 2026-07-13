import { z } from 'zod';
import { senderTypeSchema } from './inquiry-sender.schema';
import { dateSchema } from '../common';

// A single message in an inquiry thread. `senderType` drives the chat styling
// (client bubble vs employee bubble). `senderName` is resolved server-side and
// may be null when the original sender's account has since been removed
// (InquiryMessage.senderId is a soft ref — onDelete: SetNull).
export const inquiryMessageResponseSchema = z.object({
  id: z.uuid(),
  senderType: senderTypeSchema,
  senderName: z.string().nullable(),
  message: z.string(),
  createdAt: dateSchema,
});
export type InquiryMessageResponse = z.infer<
  typeof inquiryMessageResponseSchema
>;
