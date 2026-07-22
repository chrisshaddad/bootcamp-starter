import { z } from 'zod';
import { accountTypeSchema } from '../users';
import { adminAccountStatusSchema } from './admin-account-status.schema';

export const adminAccountListQuerySchema = z.strictObject({
  search: z.string().trim().max(200).optional(),
  accountType: accountTypeSchema.optional(),
  status: adminAccountStatusSchema.optional(),
  confirmed: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminAccountListQuery = z.infer<typeof adminAccountListQuerySchema>;
