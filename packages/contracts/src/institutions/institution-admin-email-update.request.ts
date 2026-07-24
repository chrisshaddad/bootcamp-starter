import { z } from 'zod';

// Request for PATCH /institutions/:id/admins/:adminId/email — Super Admin
// corrects a typo'd admin email from institution set-up. The account is
// reset to unconfirmed and a fresh invitation is sent to the new address.
export const institutionAdminEmailUpdateRequestSchema = z.object({
  email: z.email(),
});
export type InstitutionAdminEmailUpdateRequest = z.infer<
  typeof institutionAdminEmailUpdateRequestSchema
>;
