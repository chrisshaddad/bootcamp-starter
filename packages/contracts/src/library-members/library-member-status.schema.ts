import { z } from 'zod';

export const libraryMemberStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'PENDING',
  'CANCELLED',
]);
export type LibraryMemberStatus = z.infer<typeof libraryMemberStatusSchema>;
