import { z } from 'zod';

export const memberCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[\d\s\-().]+$/, 'Phone number contains invalid characters')
    .refine(
      (val) => /\d/.test(val),
      'Phone number must contain at least one digit',
    ),
  dateOfBirth: z.string().datetime({ offset: true }).optional(),
});
export type MemberCreateRequest = z.infer<typeof memberCreateRequestSchema>;
