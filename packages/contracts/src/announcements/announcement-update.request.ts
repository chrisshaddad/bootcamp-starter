import { z } from 'zod';
import { idSchema } from '../common';

export const announcementUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(140),
  bodyHtml: z.string().trim().min(1),
  groupIds: z.array(idSchema).min(1).max(100).optional(),
});
export type AnnouncementUpdateRequest = z.infer<
  typeof announcementUpdateRequestSchema
>;
