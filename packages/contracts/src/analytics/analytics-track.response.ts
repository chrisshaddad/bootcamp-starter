import { z } from 'zod';

export const analyticsTrackResponseSchema = z.strictObject({
  accepted: z.boolean(),
});

export type AnalyticsTrackResponse = z.infer<
  typeof analyticsTrackResponseSchema
>;
