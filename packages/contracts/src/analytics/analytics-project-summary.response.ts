import { z } from 'zod';
import { dateSchema } from '../common';

export const analyticsProjectSummarySchema = z.strictObject({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  recruiterViews: z.number().int().nonnegative(),
  lastViewedAt: dateSchema.nullable(),
});

export type AnalyticsProjectSummary = z.infer<
  typeof analyticsProjectSummarySchema
>;
