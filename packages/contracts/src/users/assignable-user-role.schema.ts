import { z } from 'zod';

// Roles a creator (Org Admin or Receptionist) is allowed to assign.
// SUPER_ADMIN can never be assigned through this endpoint.
export const assignableUserRoleSchema = z.enum([
  'ORG_ADMIN',
  'RECEPTIONIST',
  'MEMBER',
]);
export type AssignableUserRole = z.infer<typeof assignableUserRoleSchema>;
