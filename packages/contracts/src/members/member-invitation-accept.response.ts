import { z } from 'zod';
import { userResponseSchema } from '../users/user.response';

export const memberInvitationAcceptResponseSchema = z.object({
  user: userResponseSchema,
});
export type MemberInvitationAcceptResponse = z.infer<
  typeof memberInvitationAcceptResponseSchema
>;
