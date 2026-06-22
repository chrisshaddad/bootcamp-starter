import { z } from 'zod';
import { memberStatusSchema } from './member-status.schema';

export const memberUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  phoneNumber: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[\d\s\-().]+$/, 'Phone number contains invalid characters')
    .refine(
      (val) => /\d/.test(val),
      'Phone number must contain at least one digit',
    )
    .optional(),
  dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
  status: memberStatusSchema.optional(),
});
export type MemberUpdateRequest = z.infer<typeof memberUpdateRequestSchema>;
