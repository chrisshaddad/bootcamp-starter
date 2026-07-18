import { z } from 'zod';
import { employmentTypeSchema } from './employment-type.schema';
import { workArrangementSchema } from './work-arrangement.schema';

export const employeeProfileUpdateRequestSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  careerGoal: z.string().max(2000).nullable().optional(),
  phoneNumber: z.string().max(50).nullable().optional(),
  street1: z.string().max(200).nullable().optional(),
  street2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
  workArrangement: workArrangementSchema.nullable().optional(),
});

export type EmployeeProfileUpdateRequest = z.infer<
  typeof employeeProfileUpdateRequestSchema
>;
