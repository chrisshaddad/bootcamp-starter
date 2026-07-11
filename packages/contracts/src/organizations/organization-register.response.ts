import { z } from 'zod';
import { organizationStatusSchema } from './organization-status.schema';

// Response from POST /organizations. The library is created PENDING approval and
// a magic link has been sent to `adminEmail` so the new ORG_ADMIN can sign in.
export const organizationRegisterResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  status: organizationStatusSchema,
  adminEmail: z.email(),
});
export type OrganizationRegisterResponse = z.infer<
  typeof organizationRegisterResponseSchema
>;
