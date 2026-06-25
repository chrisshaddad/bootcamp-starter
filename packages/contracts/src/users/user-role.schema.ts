import { z } from 'zod';

export const accountTypeSchema = z.enum(['DEVELOPER', 'HIRING', 'SUPER_ADMIN']);
export type AccountType = z.infer<typeof accountTypeSchema>;