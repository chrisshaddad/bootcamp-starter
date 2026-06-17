import { z } from 'zod';
import { insightTypeSchema } from './ai-insight.response';

export const aiInsightGenerateRequestSchema = z.object({
  type: insightTypeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export type AiInsightGenerateRequest = z.infer<
  typeof aiInsightGenerateRequestSchema
>;
