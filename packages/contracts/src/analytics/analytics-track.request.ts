import { z } from 'zod';
import { uuidSchema } from '../common';

export const analyticsTrackRequestSchema = z.discriminatedUnion('eventType', [
  z.strictObject({
    eventId: uuidSchema,
    eventType: z.literal('PORTFOLIO_VIEW'),
    developerSlug: z.string().trim().min(1).max(100),
  }),
  z.strictObject({
    eventId: uuidSchema,
    eventType: z.literal('PROJECT_VIEW'),
    projectSlug: z.string().trim().min(1).max(120),
  }),
]);

export type AnalyticsTrackRequest = z.infer<typeof analyticsTrackRequestSchema>;
