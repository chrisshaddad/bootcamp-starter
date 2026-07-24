import { z } from 'zod';
import { recordTypeSchema } from './record-type.schema';
import { dateSchema } from '../common';

// A row in the patient's records timeline. `title` is derived server-side
// per record type (e.g. the test name, the chief complaint).
export const recordSummarySchema = z.object({
  id: z.uuid(),
  recordType: recordTypeSchema,
  recordDate: dateSchema,
  title: z.string(),
  uploadedByName: z.string(),
  fileCount: z.number(),
  createdAt: dateSchema,
});
export type RecordSummary = z.infer<typeof recordSummarySchema>;

// Response from GET /patients/:patientId/records
export const recordListResponseSchema = z.object({
  records: z.array(recordSummarySchema),
  total: z.number(),
});
export type RecordListResponse = z.infer<typeof recordListResponseSchema>;
