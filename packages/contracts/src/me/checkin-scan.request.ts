import { z } from 'zod';

export const checkinScanRequestSchema = z.object({
  token: z.string(),
});

export type CheckinScanRequest = z.infer<typeof checkinScanRequestSchema>;
