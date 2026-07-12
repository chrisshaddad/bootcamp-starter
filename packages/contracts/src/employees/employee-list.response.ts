import { z } from 'zod';
import { employeeResponseSchema } from './employee.response';

// Response from GET /employees — every staff member in the caller's pharmacy
// (optionally filtered by ?role=, ?status=, ?branchId=).
export const employeeListResponseSchema = z.object({
  employees: z.array(employeeResponseSchema),
  total: z.number(),
});
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;
