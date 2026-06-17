import { z } from 'zod';

export const importRowStatusSchema = z.enum(['pending', 'success', 'error']);

export const importRowResponseSchema = z.object({
  id: z.uuid(),
  importId: z.uuid(),
  rowNumber: z.number().int(),
  rawData: z.record(z.string(), z.unknown()),
  status: importRowStatusSchema,
  errorMsg: z.string().nullable(),
  entityId: z.uuid().nullable(),
  createdAt: z.string(),
});

export type ImportRowStatus = z.infer<typeof importRowStatusSchema>;
export type ImportRowResponse = z.infer<typeof importRowResponseSchema>;

export const importRowListResponseSchema = z.object({
  rows: z.array(importRowResponseSchema),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type ImportRowListResponse = z.infer<typeof importRowListResponseSchema>;
