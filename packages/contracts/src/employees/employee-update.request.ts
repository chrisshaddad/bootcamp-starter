import { z } from 'zod';
import { employeeRoleSchema } from './employee-role.schema';
import { userStatusSchema } from '../users';

// Body for PATCH /employees/:id. All fields optional, but at least one is
// required. Used for the per-employee actions: change role, reassign branch,
// and set status (e.g. INACTIVE / SUSPENDED / reactivate). Branch/pharmacy
// consistency is enforced server-side.
export const employeeUpdateRequestSchema = z
  .object({
    role: employeeRoleSchema.optional(),
    status: userStatusSchema.optional(),
    branchId: z.uuid().optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      data.status !== undefined ||
      data.branchId !== undefined,
    { message: 'Provide at least one field to update' },
  );
export type EmployeeUpdateRequest = z.infer<typeof employeeUpdateRequestSchema>;
