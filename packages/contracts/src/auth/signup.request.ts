import { z } from 'zod';

export const signupRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    accountType: z.enum(['DEVELOPER', 'HIRING']),

    displayName: z.string().trim().optional(),
    publicSlug: z.string().trim().optional(),

    organizationName: z.string().trim().optional(),
    organizationType: z
      .enum(['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'HIRING') {
      if (!data.organizationName || data.organizationName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization name is required for Hiring accounts',
          path: ['organizationName'],
        });
      }
      if (!data.organizationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization type is required for Hiring accounts',
          path: ['organizationType'],
        });
      }
    }
  });

export type SignupRequest = z.infer<typeof signupRequestSchema>;
