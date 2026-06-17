import { z } from 'zod';
import { importTypeSchema } from './import.response';

export const importCreateRequestSchema = z.object({
  type: importTypeSchema,
  fileName: z.string().min(1).max(255),
  // columnMapping: mapping from user's file column headers to our field names
  // e.g. { "Date": "date", "Description": "description", "Amount": "amount" }
  columnMapping: z.record(z.string(), z.string()),
});

export type ImportCreateRequest = z.infer<typeof importCreateRequestSchema>;

// For the start-processing endpoint
export const importStartRequestSchema = z.object({
  columnMapping: z.record(z.string(), z.string()),
});

export type ImportStartRequest = z.infer<typeof importStartRequestSchema>;
