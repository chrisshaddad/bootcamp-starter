import { z } from 'zod';
import { notificationResponseSchema } from './notification.response';

// Response from GET /notifications
export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationResponseSchema),
  total: z.number(),
  unreadCount: z.number(),
});
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;
