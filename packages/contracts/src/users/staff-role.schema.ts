import { z } from 'zod';

// The roles an Institution Admin can create/manage via User Management.
// (PATIENT is handled by the Patients module; SUPER_ADMIN/INSTITUTION_ADMIN
// are not assignable here.)
export const staffRoleSchema = z.enum(['STAFF', 'PROFESSIONAL']);
export type StaffRole = z.infer<typeof staffRoleSchema>;
