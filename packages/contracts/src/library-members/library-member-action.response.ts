import { z } from 'zod';
import { libraryMemberWithOrganizationResponseSchema } from './library-member-with-organization.response';

// Response from the SUPER_ADMIN approve/reject actions on a pending
// membership request.
export const libraryMemberActionResponseSchema = z.object({
  message: z.string(),
  libraryMember: libraryMemberWithOrganizationResponseSchema,
});
export type LibraryMemberActionResponse = z.infer<
  typeof libraryMemberActionResponseSchema
>;
