import { z } from 'zod';
import { employeeRoleSchema } from './employee-role.schema';

// Body for POST /employees. Creates a PENDING staff account (no password) and
// emails them a magic link to onboard. The account is attached to the caller's
// pharmacy server-side; the client only chooses role + branch. The server
// verifies the branch belongs to the caller's pharmacy.
export const employeeInviteRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.email('Enter a valid email'),
  role: employeeRoleSchema,
  branchId: z.uuid('Select a branch'),
});
export type EmployeeInviteRequest = z.infer<typeof employeeInviteRequestSchema>;
