import { z } from 'zod';
import { memberInvitationSchema } from './member-invitation.response';

export const memberInvitationActionResponseSchema = z.object({
  invitation: memberInvitationSchema,
});
export type MemberInvitationActionResponse = z.infer<
  typeof memberInvitationActionResponseSchema
>;
