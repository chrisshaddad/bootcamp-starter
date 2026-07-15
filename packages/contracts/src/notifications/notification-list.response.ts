import { z } from 'zod';
import { notificationResponseSchema } from './notification.response';

// Response from GET /notifications
export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationResponseSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;
