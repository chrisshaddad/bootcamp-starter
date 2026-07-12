import { z } from 'zod';

export const linkedEntityTypeSchema = z.enum([
  'MEDICAL_RECORD',
  'PRESCRIPTION',
  'ASSIGNMENT',
]);
export type LinkedEntityType = z.infer<typeof linkedEntityTypeSchema>;
