import { z } from 'zod';

/** Which kind of report to build. */
export const reportTypeSchema = z.enum(['MONTHLY', 'RANGE']);
export type ReportType = z.infer<typeof reportTypeSchema>;

/**
 * Query for a monthly report. `year`/`month` arrive as query-string values, so
 * they're coerced. Both are optional — the API defaults to the current month.
 * `month` is 1-based (1 = January … 12 = December).
 */
export const reportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

/**
 * Query for a custom date-range report. Both bounds are required, inclusive,
 * and formatted as YYYY-MM-DD.
 */
export const reportRangeQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
