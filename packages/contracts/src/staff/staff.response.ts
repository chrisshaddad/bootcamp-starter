import { z } from 'zod';
import { dateSchema } from '../common';
import { staffRoleSchema } from './staff-role.schema';

// A single staff member (a login User pinned to the library via organizationId).
export const staffResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  role: staffRoleSchema,
  isConfirmed: z.boolean(),
  createdAt: dateSchema,
});
export type StaffResponse = z.infer<typeof staffResponseSchema>;
