import { z } from 'zod';
import { idSchema } from '../common';

export const announcementTargetGroupSchema = z.object({
  id: idSchema,
  name: z.string(),
});
export type AnnouncementTargetGroup = z.infer<
  typeof announcementTargetGroupSchema
>;
