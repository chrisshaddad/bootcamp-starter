import { z } from 'zod';

export const recordTypeSchema = z.enum([
  'LAB_RESULT',
  'CONSULTATION',
  'PRESCRIPTION',
  'SCAN',
  'VACCINATION',
]);
export type RecordType = z.infer<typeof recordTypeSchema>;
