import { z } from 'zod';

export const departmentCreateRequestSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  managerId: z.string().uuid().optional(),
});

export type DepartmentCreateRequest = z.infer<typeof departmentCreateRequestSchema>;
