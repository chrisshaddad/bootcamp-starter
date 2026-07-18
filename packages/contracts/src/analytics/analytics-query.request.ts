import { z } from 'zod';
import { analyticsRangeSchema } from './analytics-range.schema';

export const analyticsQuerySchema = z.strictObject({
  range: analyticsRangeSchema.default('30D'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
