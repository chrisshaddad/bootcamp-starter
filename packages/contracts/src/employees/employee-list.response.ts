import { z } from 'zod';
import { employeeResponseSchema } from './employee.response';

export const employeeListResponseSchema = z.object({
  employees: z.array(employeeResponseSchema),
  total: z.number(),
});

export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;
