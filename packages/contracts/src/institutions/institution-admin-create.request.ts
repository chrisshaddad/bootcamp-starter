import { z } from 'zod';

// Request for POST /institutions/:id/admins — Super Admin adds another admin
// to an existing institution (e.g. it ended up with none, or a second admin
// is needed). Mirrors the admin sub-object used at institution creation.
export const institutionAdminCreateRequestSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
});
export type InstitutionAdminCreateRequest = z.infer<
  typeof institutionAdminCreateRequestSchema
>;
