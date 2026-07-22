import { z } from 'zod';

// The roles a staff member of a library can hold. A subset of UserRole:
// SUPER_ADMIN is platform-level and MEMBER is a patron, neither is org staff.
export const staffRoleSchema = z.enum(['ORG_ADMIN', 'LIBRARIAN']);
export type StaffRole = z.infer<typeof staffRoleSchema>;
