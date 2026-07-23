import { z } from 'zod';
import { libraryMembershipTypeSchema } from './library-member-type.schema';

// Request for POST /portal/memberships - a patron requesting access to a
// specific library. userId always comes from the session, never the body.
export const portalMembershipRequestSchema = z.object({
  organizationSlug: z.string(),
  membershipType: libraryMembershipTypeSchema,
});
export type PortalMembershipRequest = z.infer<
  typeof portalMembershipRequestSchema
>;
