import { z } from 'zod';
import { memberInvitationSchema } from './member-invitation.response';

export const memberInvitationListResponseSchema = z.object({
  invitations: z.array(memberInvitationSchema),
  total: z.number(),
});
export type MemberInvitationListResponse = z.infer<
  typeof memberInvitationListResponseSchema
>;
