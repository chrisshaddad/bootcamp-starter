import { z } from 'zod';

// Lightweight branch list for the invite/reassign dropdowns. Scoped to the
// caller's pharmacy server-side. Just id + name — no geo/contact detail needed
// to pick a branch. Returned by GET /employees/branches.
export const employeeBranchOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type EmployeeBranchOption = z.infer<typeof employeeBranchOptionSchema>;

export const employeeBranchOptionsResponseSchema = z.array(
  employeeBranchOptionSchema,
);
export type EmployeeBranchOptionsResponse = z.infer<
  typeof employeeBranchOptionsResponseSchema
>;
