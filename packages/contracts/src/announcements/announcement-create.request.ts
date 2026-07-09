import { z } from 'zod';
import { idSchema } from '../common';
import { announcementAudienceSchema } from './announcement-audience.schema';
import { announcementScopeSchema } from './announcement-scope.schema';

export const announcementCreateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    bodyHtml: z.string().trim().min(1),
    scope: announcementScopeSchema,
    audience: announcementAudienceSchema.optional(),
    eventId: idSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'EVENT') {
      if (!value.eventId) {
        ctx.addIssue({
          code: 'custom',
          path: ['eventId'],
          message: 'Event announcements require an event',
        });
      }
      if (!value.audience) {
        ctx.addIssue({
          code: 'custom',
          path: ['audience'],
          message: 'Event announcements require an audience',
        });
      }
      return;
    }

    if (value.eventId) {
      ctx.addIssue({
        code: 'custom',
        path: ['eventId'],
        message: 'Only event announcements can reference an event',
      });
    }

    if (value.audience) {
      ctx.addIssue({
        code: 'custom',
        path: ['audience'],
        message: 'Only event announcements can include an audience',
      });
    }
  });
export type AnnouncementCreateRequest = z.infer<
  typeof announcementCreateRequestSchema
>;
