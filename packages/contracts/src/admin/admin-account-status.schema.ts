import { z } from 'zod';

export const adminAccountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

export type AdminAccountStatus = z.infer<typeof adminAccountStatusSchema>;
