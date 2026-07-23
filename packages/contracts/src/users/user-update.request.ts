import { z } from 'zod';
import { userRoleSchema } from './user-role.schema';

export const userUpdateRequestSchema = z.object({
  role: userRoleSchema.optional(),
  departmentId: z.uuid().nullable().optional(),
  managerId: z.uuid().nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  level: z.number().int().positive().nullable().optional(),
});

export type UserUpdateRequest = z.infer<typeof userUpdateRequestSchema>;
