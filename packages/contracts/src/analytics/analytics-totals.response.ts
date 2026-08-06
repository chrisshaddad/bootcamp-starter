import { z } from 'zod';

export const analyticsTotalsSchema = z.strictObject({
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  recruiterViews: z.number().int().nonnegative(),
  portfolioViews: z.number().int().nonnegative(),
  projectViews: z.number().int().nonnegative(),
});

export type AnalyticsTotals = z.infer<typeof analyticsTotalsSchema>;
