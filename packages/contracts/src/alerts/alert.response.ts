import { z } from 'zod';

export const alertStatusSchema = z.enum([
  'ACTIVE',
  'TRIGGERED',
  'RESOLVED',
  'DISMISSED',
]);

export const alertResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  goalId: z.uuid().nullable(),
  status: alertStatusSchema,
  title: z.string(),
  message: z.string(),
  thresholdPct: z.string().nullable(),
  triggeredAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AlertStatus = z.infer<typeof alertStatusSchema>;
export type AlertResponse = z.infer<typeof alertResponseSchema>;

export const alertListResponseSchema = z.object({
  alerts: z.array(alertResponseSchema),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type AlertListResponse = z.infer<typeof alertListResponseSchema>;
