import { z } from 'zod';

// The roles an Institution Admin can create/manage via User Management.
// (PATIENT is handled by the Patients module; SUPER_ADMIN is not assignable
// here — only the platform can create super admins.)
export const staffRoleSchema = z.enum([
  'STAFF',
  'PROFESSIONAL',
  'INSTITUTION_ADMIN',
]);
export type StaffRole = z.infer<typeof staffRoleSchema>;
