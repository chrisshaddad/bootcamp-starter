import { z } from 'zod';
import { dateSchema } from '../common';
import { analyticsRangeSchema } from './analytics-range.schema';
import { analyticsTotalsSchema } from './analytics-totals.response';
import { analyticsDailyPointSchema } from './analytics-daily-point.response';
import { analyticsProjectSummarySchema } from './analytics-project-summary.response';
import { analyticsReferrerSchema } from './analytics-referrer.response';

export const analyticsOverviewResponseSchema = z.strictObject({
  range: analyticsRangeSchema,
  period: z.strictObject({ from: dateSchema, to: dateSchema }),
  totals: analyticsTotalsSchema,
  comparison: z.strictObject({
    totalViewsPercent: z.number().nullable(),
    uniqueVisitorsPercent: z.number().nullable(),
  }),
  daily: z.array(analyticsDailyPointSchema),
  projects: z.array(analyticsProjectSummarySchema),
  referrers: z.array(analyticsReferrerSchema),
});

export type AnalyticsOverviewResponse = z.infer<
  typeof analyticsOverviewResponseSchema
>;
