import { z } from 'zod';

export const libraryMembershipTypeSchema = z.enum([
  'STUDENT',
  'REGULAR',
  'PREMIUM',
]);
export type LibraryMembershipType = z.infer<typeof libraryMembershipTypeSchema>;
