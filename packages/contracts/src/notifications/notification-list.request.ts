import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

// Query params for GET /notifications
export const notificationListQuerySchema = z.object({
  ...paginationQuerySchema.shape,
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
