import { z } from 'zod';

export const notificationPreferencesUpdateRequestSchema = z.object({
  projectInvitationEmails: z.boolean(),
});

export type NotificationPreferencesUpdateRequest = z.infer<
  typeof notificationPreferencesUpdateRequestSchema
>;
