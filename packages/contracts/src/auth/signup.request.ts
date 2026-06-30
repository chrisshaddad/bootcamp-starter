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

    displayName: z
      .string()
      .trim()
      .min(1, 'Display name is required')
      .optional(),
    publicSlug: z.string().trim().min(1, 'Public slug is required').optional(),

    organizationName: z
      .string()
      .trim()
      .min(1, 'Organization name is required')
      .optional(),
    organizationType: z
      .enum(['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'DEVELOPER') {
      if (!data.displayName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Display name is required for Developers',
          path: ['displayName'],
        });
      }
      if (!data.publicSlug) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Public slug is required for Developers',
          path: ['publicSlug'],
        });
      }
    } else if (data.accountType === 'HIRING') {
      if (!data.organizationName) {
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
