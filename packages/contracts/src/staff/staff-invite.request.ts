import { z } from 'zod';
import { staffRoleSchema } from './staff-role.schema';

// Request for POST /staff — invite a staff member to the current library.
// Creates a login User pinned to the org and emails them a magic sign-in link.
export const staffInviteRequestSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  // Defaults to LIBRARIAN when omitted (the common case).
  role: staffRoleSchema.optional(),
});
export type StaffInviteRequest = z.infer<typeof staffInviteRequestSchema>;
