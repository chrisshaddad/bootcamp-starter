import { z } from 'zod';
import { employeeRoleSchema } from './employee-role.schema';
import { userStatusSchema } from '../users';
import { dateSchema } from '../common';

// A single staff member as shown in the pharmacy-admin employees console.
// `branchName` is resolved server-side so the table shows a name, not a UUID.
// Returned by the list rows and by the invite/update mutations (single item)
// so the client can update its cache without a refetch.
export const employeeResponseSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  role: employeeRoleSchema,
  status: userStatusSchema,
  branchId: z.uuid().nullable(),
  branchName: z.string().nullable(),
  createdAt: dateSchema,
});
export type EmployeeResponse = z.infer<typeof employeeResponseSchema>;
