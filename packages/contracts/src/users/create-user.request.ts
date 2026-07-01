import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Invalid email address'),
    role: z.enum(['ORG_ADMIN', 'MEMBER']),
    dateOfBirth: z.string().optional(),
    className: z.string().trim().optional(),
    sectionName: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'MEMBER' && !data.className) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Class / Grade is required for students',
        path: ['className'],
      });
    }

    if (data.role === 'MEMBER' && !data.sectionName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Section is required for students',
        path: ['sectionName'],
      });
    }
  });

export type CreateUserBody = z.infer<typeof createUserSchema>;
