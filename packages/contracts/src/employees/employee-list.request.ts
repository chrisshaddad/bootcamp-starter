import { z } from 'zod';
import { employeeRoleSchema } from './employee-role.schema';
import { userStatusSchema } from '../users';

// Query params for GET /employees. All optional; omitting them returns every
// employee in the caller's pharmacy. The server always scopes the result to the
// caller's pharmacyId regardless of these filters.
export const employeeListQuerySchema = z.object({
  role: employeeRoleSchema.optional(),
  status: userStatusSchema.optional(),
  branchId: z.uuid().optional(),
});
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
