import { z } from 'zod';
import { dateSchema } from '../common';
import { linkedEntityTypeSchema } from './linked-entity-type.schema';

// A single notification in the recipient's inbox
export const notificationResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  linkedEntityType: linkedEntityTypeSchema.nullable(),
  linkedEntityId: z.string().nullable(),
  createdAt: dateSchema,
});
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
