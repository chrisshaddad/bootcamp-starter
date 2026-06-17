import { z } from 'zod';

export const insightTypeSchema = z.enum([
  'PROFITABILITY',
  'EXPENSE',
  'REVENUE',
  'GOAL',
]);

export const aiInsightResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  type: insightTypeSchema,
  title: z.string(),
  summary: z.string(),
  recommendations: z.array(z.string()),
  metrics: z.record(z.string(), z.unknown()),
  periodStart: z.string(),
  periodEnd: z.string(),
  createdAt: z.string(),
});

export type InsightType = z.infer<typeof insightTypeSchema>;
export type AiInsightResponse = z.infer<typeof aiInsightResponseSchema>;

export const aiInsightListResponseSchema = z.object({
  insights: z.array(aiInsightResponseSchema),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type AiInsightListResponse = z.infer<typeof aiInsightListResponseSchema>;
