import { z } from 'zod';

export const announcementScopeSchema = z.enum([
  'SITE',
  'ORG',
  'GROUP',
  'EVENT',
]);
export type AnnouncementScope = z.infer<typeof announcementScopeSchema>;
