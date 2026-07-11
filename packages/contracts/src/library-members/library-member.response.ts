import { z } from 'zod';
import { dateSchema } from '../common';
import { libraryMemberStatusSchema } from './library-member-status.schema';
import { libraryMembershipTypeSchema } from './library-member-type.schema';

const libraryMemberUserSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

// Response shape for a single LibraryMember
export const libraryMemberResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid().nullable(),
  libraryCardNumber: z.string(),
  membershipType: libraryMembershipTypeSchema,
  membershipStatus: libraryMemberStatusSchema,
  membershipStartDate: dateSchema,
  membershipEndDate: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  user: libraryMemberUserSummarySchema.nullable(),
});
export type LibraryMemberResponse = z.infer<typeof libraryMemberResponseSchema>;
