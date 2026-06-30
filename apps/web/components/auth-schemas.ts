import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signupAccountTypeSchema = z.enum(['DEVELOPER', 'HIRING']);

export const signupFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  accountType: signupAccountTypeSchema,
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;
