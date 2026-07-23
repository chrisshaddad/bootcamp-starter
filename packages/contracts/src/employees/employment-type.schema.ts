import { z } from 'zod';

export const employmentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
]);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
