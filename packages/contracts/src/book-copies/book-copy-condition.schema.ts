import { z } from 'zod';

export const bookCopyConditionSchema = z.enum([
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);
export type BookCopyCondition = z.infer<typeof bookCopyConditionSchema>;
