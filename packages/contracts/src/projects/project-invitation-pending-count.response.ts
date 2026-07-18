import { z } from 'zod';

export const projectInvitationPendingCountResponseSchema = z.strictObject({
  pendingCount: z.number().int().nonnegative(),
});

export type ProjectInvitationPendingCountResponse = z.infer<
  typeof projectInvitationPendingCountResponseSchema
>;
