import { z } from 'zod';

export const analyticsRangeSchema = z.enum(['7D', '30D', '90D']);

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
