import { z } from 'zod';

// Request for POST /auth/active-organization - a patron selecting which of
// their ACTIVE memberships is the current session's library.
export const activeOrganizationRequestSchema = z.object({
  organizationId: z.uuid(),
});
export type ActiveOrganizationRequest = z.infer<
  typeof activeOrganizationRequestSchema
>;
