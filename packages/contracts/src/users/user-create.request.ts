import { z } from 'zod';
import { isPharmacyScopedRole, userRoleSchema } from './user-role.schema';
import { userStatusSchema } from './user-status.schema';

// Body for POST /users. The created account has no password — the user sets
// one via the magic-link / set-password flow, same as seeded accounts.
// A pharmacy-scoped role must carry a `pharmacyId`; the server also verifies
// the pharmacy exists.
export const userCreateRequestSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.email('Enter a valid email'),
    role: userRoleSchema,
    status: userStatusSchema,
    pharmacyId: z.uuid().nullable().optional(),
  })
  .refine((data) => !isPharmacyScopedRole(data.role) || !!data.pharmacyId, {
    message: 'Select a pharmacy for this role',
    path: ['pharmacyId'],
  });
export type UserCreateRequest = z.infer<typeof userCreateRequestSchema>;
