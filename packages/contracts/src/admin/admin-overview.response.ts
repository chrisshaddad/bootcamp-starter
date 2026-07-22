import { z } from 'zod';
import { dateSchema } from '../common';
import { adminAuditLogResponseSchema } from './admin-audit-log.response';

export const adminOverviewResponseSchema = z.strictObject({
  generatedAt: dateSchema,
  accounts: z.strictObject({
    total: z.number().int().nonnegative(),
    developers: z.number().int().nonnegative(),
    hiring: z.number().int().nonnegative(),
    superAdmins: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    suspended: z.number().int().nonnegative(),
    unconfirmed: z.number().int().nonnegative(),
    githubConnectedDevelopers: z.number().int().nonnegative(),
    createdLast30Days: z.number().int().nonnegative(),
  }),
  projects: z.strictObject({
    total: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    suspended: z.number().int().nonnegative(),
    moderated: z.number().int().nonnegative(),
    createdLast30Days: z.number().int().nonnegative(),
  }),
  collaboration: z.strictObject({
    members: z.number().int().nonnegative(),
    pendingInvitations: z.number().int().nonnegative(),
  }),
  topTechnologies: z.array(
    z.strictObject({
      name: z.string(),
      slug: z.string(),
      projectCount: z.number().int().nonnegative(),
    }),
  ),
  recentAuditLogs: z.array(adminAuditLogResponseSchema),
});

export type AdminOverviewResponse = z.infer<typeof adminOverviewResponseSchema>;
