import { z } from 'zod';
import { announcementSchema } from './announcement.response';

export const announcementListResponseSchema = z.object({
  announcements: z.array(announcementSchema),
  total: z.number(),
});
export type AnnouncementListResponse = z.infer<
  typeof announcementListResponseSchema
>;
