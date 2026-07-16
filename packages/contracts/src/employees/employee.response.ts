import { z } from 'zod';
import { dateSchema } from '../common';

const employeeDepartmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const employeeManagerSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

const employeeProfileSchema = z.object({
  bio: z.string().nullable(),
  careerGoal: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
});

const employeeSkillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  proficiencyLevel: z.number(),
});

export const employeeResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  title: z.string().nullable(),
  level: z.number().nullable(),
  organizationId: z.uuid().nullable(),
  department: employeeDepartmentSchema.nullable(),
  manager: employeeManagerSchema.nullable(),
  profile: employeeProfileSchema.nullable(),
  skills: z.array(employeeSkillSchema),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type EmployeeResponse = z.infer<typeof employeeResponseSchema>;
