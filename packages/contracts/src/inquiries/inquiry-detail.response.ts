import { z } from 'zod';
import { inquiryStatusSchema } from './inquiry-status.schema';
import { inquiryMessageResponseSchema } from './inquiry-message.response';
import { medicineResponseSchema } from '../medicines';
import { dateSchema } from '../common';

// Client info for the context panel. Phone may be absent on some accounts.
const inquiryClientSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  phoneNumber: z.string().nullable(),
});

// Live inventory for the inquired medicine AT THIS BRANCH, rolled up from stock
// batches. Lets the officer answer "do we have it?" without leaving the thread.
const inquiryStockSchema = z.object({
  totalQuantity: z.number(),
  batchCount: z.number(),
  nearestExpiry: dateSchema.nullable(),
});

// Response from GET /inquiries/:id: the full conversation plus the side-panel
// context. Scoped server-side to the caller's tenant. Each inquiry is about a
// single medicine, surfaced as the complete catalog record (`medicineResponse`)
// so the officer sees every available detail; `stock` is that medicine's live
// inventory at this branch.
export const inquiryDetailResponseSchema = z.object({
  id: z.uuid(),
  status: inquiryStatusSchema,
  branchName: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  client: inquiryClientSchema,
  medicine: medicineResponseSchema,
  stock: inquiryStockSchema,
  messages: z.array(inquiryMessageResponseSchema),
});
export type InquiryDetailResponse = z.infer<typeof inquiryDetailResponseSchema>;
