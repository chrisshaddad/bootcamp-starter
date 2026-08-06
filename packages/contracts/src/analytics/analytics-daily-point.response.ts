import { z } from 'zod';

export const analyticsDailyPointSchema = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  recruiterViews: z.number().int().nonnegative(),
});

export type AnalyticsDailyPoint = z.infer<typeof analyticsDailyPointSchema>;
