import { z } from 'zod';

// The lifecycle of a client inquiry, mirroring the Prisma `InquiryStatus` enum.
// PENDING  — new, no employee has replied yet.
// IN_PROGRESS — an officer has replied; conversation is ongoing.
// ANSWERED — the officer considers the question answered.
// CLOSED   — no further action expected.
export const inquiryStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
]);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;
