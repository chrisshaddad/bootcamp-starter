import { z } from 'zod';
import { libraryMemberResponseSchema } from './library-member.response';

const libraryMemberOrganizationSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
});

// LibraryMemberResponse plus its parent organization - used anywhere a
// LibraryMember is viewed outside the context of a single already-known
// organization (a patron's own memberships across libraries, the
// SUPER_ADMIN's cross-org pending queue).
export const libraryMemberWithOrganizationResponseSchema =
  libraryMemberResponseSchema.extend({
    organization: libraryMemberOrganizationSummarySchema,
  });
export type LibraryMemberWithOrganizationResponse = z.infer<
  typeof libraryMemberWithOrganizationResponseSchema
>;
