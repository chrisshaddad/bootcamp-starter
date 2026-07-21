import { z } from 'zod';

export const notificationPreferencesResponseSchema = z.object({
  projectInvitationEmails: z.boolean(),
});

export type NotificationPreferencesResponse = z.infer<
  typeof notificationPreferencesResponseSchema
>;
