import { z } from 'zod';

// A single admin (role INSTITUTION_ADMIN) belonging to an institution, as
// shown on the Super Admin's institution detail page.
export const institutionAdminSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
});
export type InstitutionAdmin = z.infer<typeof institutionAdminSchema>;
