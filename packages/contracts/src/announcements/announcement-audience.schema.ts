import { z } from 'zod';

export const announcementAudienceSchema = z.enum([
  'WHOLE_ORG',
  'EVENT_ATTENDEES',
]);
export type AnnouncementAudience = z.infer<typeof announcementAudienceSchema>;
