import { z } from 'zod';

export const analyticsReferrerSchema = z.strictObject({
  source: z.string(),
  views: z.number().int().nonnegative(),
});

export type AnalyticsReferrer = z.infer<typeof analyticsReferrerSchema>;
