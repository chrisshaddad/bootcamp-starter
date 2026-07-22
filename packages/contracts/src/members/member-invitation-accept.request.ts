import { z } from 'zod';

export const memberInvitationAcceptRequestSchema = z.object({
  token: z.string().min(1),
});
export type MemberInvitationAcceptRequest = z.infer<
  typeof memberInvitationAcceptRequestSchema
>;
