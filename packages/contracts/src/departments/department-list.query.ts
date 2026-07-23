import { z } from 'zod';

export const departmentListQuerySchema = z.object({
  // Only honored for SUPER_ADMIN callers (see DepartmentsService.findAll) -
  // lets an admin scope a department picker to a specific organization.
  organizationId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;
