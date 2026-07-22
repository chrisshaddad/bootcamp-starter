import { z } from 'zod';
import { staffRoleSchema } from './staff-role.schema';

// Request for PATCH /staff/:id/role
export const staffRoleUpdateRequestSchema = z.object({
  role: staffRoleSchema,
});
export type StaffRoleUpdateRequest = z.infer<
  typeof staffRoleUpdateRequestSchema
>;
