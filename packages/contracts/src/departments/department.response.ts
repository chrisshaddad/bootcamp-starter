import { z } from 'zod';
import { dateSchema } from '../common';

const departmentManagerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});

export const departmentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.string().uuid(),
  manager: departmentManagerSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type DepartmentResponse = z.infer<typeof departmentResponseSchema>;
