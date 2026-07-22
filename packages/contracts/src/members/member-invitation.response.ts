import { z } from 'zod';
import { memberRoleSchema } from './member-role.schema';

export const memberInvitationSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  username: z.string(),
  role: memberRoleSchema,
  organizationId: z.uuid(),
  invitedById: z.uuid(),
  expiresAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type MemberInvitation = z.infer<typeof memberInvitationSchema>;
