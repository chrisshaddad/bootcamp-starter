import { z } from 'zod';
import { idSchema } from '../common';

export const announcementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  eventId: idSchema.optional(),
});
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>;
