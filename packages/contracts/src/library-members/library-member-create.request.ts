import { z } from 'zod';
import { libraryMemberStatusSchema } from './library-member-status.schema';
import { libraryMembershipTypeSchema } from './library-member-type.schema';

// Request for POST /library-members
export const libraryMemberCreateRequestSchema = z.object({
  // Optional: a library card can belong to a walk-in patron with no login
  // account. When present, must reference a MEMBER-role User.
  userId: z.uuid().optional(),
  libraryCardNumber: z.string().min(1, 'Library card number is required'),
  // No DB default for either field (unlike BookCopy's status/condition) -
  // the schema requires staff to explicitly choose both at signup time.
  membershipType: libraryMembershipTypeSchema,
  membershipStatus: libraryMemberStatusSchema,
  membershipStartDate: z.coerce.date().optional(),
  membershipEndDate: z.coerce.date().optional(),
});
export type LibraryMemberCreateRequest = z.infer<
  typeof libraryMemberCreateRequestSchema
>;
