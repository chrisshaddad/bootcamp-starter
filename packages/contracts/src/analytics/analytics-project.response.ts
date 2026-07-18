import { z } from 'zod';
import { dateSchema } from '../common';
import { analyticsRangeSchema } from './analytics-range.schema';
import { analyticsTotalsSchema } from './analytics-totals.response';
import { analyticsDailyPointSchema } from './analytics-daily-point.response';
import { analyticsReferrerSchema } from './analytics-referrer.response';

export const analyticsProjectResponseSchema = z.strictObject({
  range: analyticsRangeSchema,
  period: z.strictObject({ from: dateSchema, to: dateSchema }),
  project: z.strictObject({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  }),
  totals: analyticsTotalsSchema,
  comparison: z.strictObject({
    totalViewsPercent: z.number().nullable(),
    uniqueVisitorsPercent: z.number().nullable(),
  }),
  daily: z.array(analyticsDailyPointSchema),
  referrers: z.array(analyticsReferrerSchema),
  audience: z.strictObject({
    anonymous: z.number().int().nonnegative(),
    recruiters: z.number().int().nonnegative(),
    developers: z.number().int().nonnegative(),
    other: z.number().int().nonnegative(),
  }),
});

export type AnalyticsProjectResponse = z.infer<
  typeof analyticsProjectResponseSchema
>;
