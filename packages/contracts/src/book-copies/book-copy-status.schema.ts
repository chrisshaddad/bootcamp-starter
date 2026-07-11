import { z } from 'zod';

export const bookCopyStatusSchema = z.enum([
  'AVAILABLE',
  'ON_LOAN',
  'RESERVED',
  'LOST',
  'MAINTENANCE',
]);
export type BookCopyStatus = z.infer<typeof bookCopyStatusSchema>;
