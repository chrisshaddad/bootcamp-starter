import { z } from 'zod';

export const departmentUpdateRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export type DepartmentUpdateRequest = z.infer<typeof departmentUpdateRequestSchema>;
