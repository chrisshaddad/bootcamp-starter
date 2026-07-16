import { z } from 'zod';

export const announcementUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(140),
  bodyHtml: z.string().trim().min(1),
});
export type AnnouncementUpdateRequest = z.infer<
  typeof announcementUpdateRequestSchema
>;
