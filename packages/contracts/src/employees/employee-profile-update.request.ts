import { z } from 'zod';

export const employeeProfileUpdateRequestSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  careerGoal: z.string().max(2000).nullable().optional(),
});

export type EmployeeProfileUpdateRequest = z.infer<
  typeof employeeProfileUpdateRequestSchema
>;
