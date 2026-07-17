import { z } from 'zod';
import { memberRoleSchema } from './member-role.schema';

export const memberUpdateRequestSchema = z
  .object({
    username: z.string().trim().min(1).max(120).optional(),
    role: memberRoleSchema.optional(),
  })
  .refine((value) => value.username !== undefined || value.role !== undefined, {
    message: 'At least one field must be provided',
  });
export type MemberUpdateRequest = z.infer<typeof memberUpdateRequestSchema>;
