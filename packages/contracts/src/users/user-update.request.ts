import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';
import { userStatusSchema } from './user-status.schema';

// Body for PATCH /users/:id. All fields are optional, but at least one must be
// present so an empty update is rejected. Role ↔ pharmacy consistency is
// enforced server-side (the final role determines whether a pharmacy applies).
export const userUpdateRequestSchema = z
  .object({
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    pharmacyId: z.uuid().nullable().optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      data.status !== undefined ||
      data.pharmacyId !== undefined,
    { message: 'Provide at least one field to update' },
  );
export type UserUpdateRequest = z.infer<typeof userUpdateRequestSchema>;
