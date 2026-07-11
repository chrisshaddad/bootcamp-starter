import { z } from 'zod';

export const libraryMembershipTypeSchema = z.enum([
  'STUDENT',
  'ADULT',
  'PREMIUM',
]);
export type LibraryMembershipType = z.infer<typeof libraryMembershipTypeSchema>;
