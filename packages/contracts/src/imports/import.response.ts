import { z } from 'zod';

export const importStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'PARTIAL',
]);

export const importTypeSchema = z.enum(['EXPENSES', 'SALES', 'PRODUCTS', 'SERVICES']);

export const importResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  createdById: z.uuid(),
  type: importTypeSchema,
  status: importStatusSchema,
  fileName: z.string(),
  fileUrl: z.string().nullable(),
  rowCount: z.number().int(),
  successCount: z.number().int(),
  errorCount: z.number().int(),
  columnMapping: z.record(z.string(), z.string()).nullable(),
  errorSummary: z.string().nullable(),
  processedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z
    .object({ id: z.uuid(), name: z.string(), email: z.string() })
    .optional(),
});

export type ImportStatus = z.infer<typeof importStatusSchema>;
export type ImportType = z.infer<typeof importTypeSchema>;
export type ImportResponse = z.infer<typeof importResponseSchema>;
