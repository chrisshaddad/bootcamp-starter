import { z } from 'zod';
import { projectRoleSchema } from './project-role.schema';

export const projectCapabilitiesSchema = z.strictObject({
  canView: z.boolean(),
  canEditContent: z.boolean(),
  canPublish: z.boolean(),
  canManageInvitations: z.boolean(),
  canDelete: z.boolean(),
});

export const projectAccessResponseSchema = z.strictObject({
  currentUserRole: projectRoleSchema.nullable(),
  capabilities: projectCapabilitiesSchema,
});

export type ProjectCapabilities = z.infer<typeof projectCapabilitiesSchema>;
export type ProjectAccessResponse = z.infer<typeof projectAccessResponseSchema>;
