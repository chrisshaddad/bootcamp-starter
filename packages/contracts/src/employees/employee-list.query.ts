import { z } from 'zod';

export const employeeListQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  // z.coerce.boolean() would treat "?mine=false" as true (Boolean("false") is
  // truthy) - preprocess the raw "true"/"false" query string explicitly instead.
  mine: z
    .preprocess((value) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
