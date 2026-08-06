import { z } from 'zod';
import { dateSchema } from '../common';
import { projectStatusSchema } from '../projects';

export const analyticsProjectSummarySchema = z.strictObject({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: projectStatusSchema,
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  recruiterViews: z.number().int().nonnegative(),
  lastViewedAt: dateSchema.nullable(),
});

export type AnalyticsProjectSummary = z.infer<
  typeof analyticsProjectSummarySchema
>;
