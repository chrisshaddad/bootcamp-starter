import { z } from 'zod';
import { dateSchema, idSchema } from '../common';
import { announcementAudienceSchema } from './announcement-audience.schema';
import { announcementScopeSchema } from './announcement-scope.schema';

export const announcementSchema = z.object({
  id: idSchema,
  title: z.string(),
  bodyHtml: z.string(),
  scope: announcementScopeSchema,
  audience: announcementAudienceSchema.nullable(),
  organizationId: idSchema.nullable(),
  eventId: idSchema.nullable(),
  authorId: idSchema,
  authorName: z.string(),
  eventName: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Announcement = z.infer<typeof announcementSchema>;
