import { z } from 'zod';
import { departmentResponseSchema } from './department.response';

export const departmentListResponseSchema = z.object({
  departments: z.array(departmentResponseSchema),
  total: z.number(),
});

export type DepartmentListResponse = z.infer<typeof departmentListResponseSchema>;
