import { z } from 'zod';

export const recurrenceTypeSchema = z.enum([
  'NONE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

export type RecurrenceType = z.infer<typeof recurrenceTypeSchema>;
