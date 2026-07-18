import { z } from 'zod';

export const analyticsTrackRequestSchema = z.discriminatedUnion('eventType', [
  z.strictObject({
    eventType: z.literal('PORTFOLIO_VIEW'),
    developerSlug: z.string().trim().min(1).max(100),
  }),
  z.strictObject({
    eventType: z.literal('PROJECT_VIEW'),
    projectSlug: z.string().trim().min(1).max(120),
  }),
]);

export type AnalyticsTrackRequest = z.infer<typeof analyticsTrackRequestSchema>;
