import { z } from 'zod';
import { projectInvitationResponseSchema } from './project-invitation.response';

export const projectInvitationListResponseSchema = z.strictObject({
  data: z.array(projectInvitationResponseSchema),
  meta: z.strictObject({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ProjectInvitationListResponse = z.infer<
  typeof projectInvitationListResponseSchema
>;
