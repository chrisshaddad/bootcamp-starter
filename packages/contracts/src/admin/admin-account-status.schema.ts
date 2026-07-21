import { z } from 'zod';

export const adminAccountStatusSchema = z.enum([
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

export type AdminAccountStatus = z.infer<typeof adminAccountStatusSchema>;
