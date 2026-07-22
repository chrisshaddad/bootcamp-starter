import { z } from 'zod';
import { dateSchema, uuidSchema } from '../common';
import { accountTypeSchema } from '../users';
import { adminAccountStatusSchema } from './admin-account-status.schema';

export const adminAccountResponseSchema = z.strictObject({
  id: uuidSchema,
  email: z.string().email(),
  displayName: z.string(),
  accountType: accountTypeSchema,
  status: adminAccountStatusSchema,
  isConfirmed: z.boolean(),
  githubUsername: z.string().nullable(),
  githubConnected: z.boolean(),
  suspensionReason: z.string().nullable(),
  suspendedAt: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  counts: z.strictObject({
    ownedProjects: z.number().int().nonnegative(),
    projectMemberships: z.number().int().nonnegative(),
    activeSessions: z.number().int().nonnegative(),
  }),
});

export type AdminAccountResponse = z.infer<typeof adminAccountResponseSchema>;
