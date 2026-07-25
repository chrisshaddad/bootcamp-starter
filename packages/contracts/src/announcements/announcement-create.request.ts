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
    groupIds: z.array(idSchema).min(1).max(100).optional(),
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
      if (value.groupIds) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupIds'],
          message: 'Event announcements cannot target groups',
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

    if (value.scope === 'GROUP') {
      if (!value.groupIds?.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupIds'],
          message: 'Group announcements require at least one group',
        });
      }
      return;
    }

    if (value.groupIds) {
      ctx.addIssue({
        code: 'custom',
        path: ['groupIds'],
        message: 'Only group announcements can target groups',
      });
    }
  });
export type AnnouncementCreateRequest = z.infer<
  typeof announcementCreateRequestSchema
>;
