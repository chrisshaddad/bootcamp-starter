import { z } from 'zod';
import { projectInvitationStatusSchema } from './project-invitation-status.schema';

export const projectInvitationListQuerySchema = z.strictObject({
  status: projectInvitationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ProjectInvitationListQuery = z.infer<
  typeof projectInvitationListQuerySchema
>;
