import { z } from 'zod';
import { inquiryStatusSchema } from './inquiry-status.schema';
import { dateSchema } from '../common';

// One row in the inquiry queue. `clientName`, `medicineName`, and `branchName`
// are resolved server-side so the table shows names, not UUIDs. Each inquiry is
// scoped to a single medicine (the schema's `Inquiry.medicineId`). `branchName`
// matters for the pharmacy-admin (cross-branch) view; for a single-branch
// officer every row carries the same branch. `lastUpdatedAt` drives the "last
// updated" column and the default sort.
export const inquiryResponseSchema = z.object({
  id: z.uuid(),
  clientName: z.string(),
  medicineId: z.uuid(),
  medicineName: z.string(),
  branchName: z.string(),
  status: inquiryStatusSchema,
  messageCount: z.number(),
  lastUpdatedAt: dateSchema,
  createdAt: dateSchema,
});
export type InquiryResponse = z.infer<typeof inquiryResponseSchema>;
