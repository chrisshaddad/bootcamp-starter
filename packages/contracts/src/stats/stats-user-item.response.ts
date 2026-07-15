import { z } from 'zod';

export const statsUserItemSchema = z.object({
  userId: z.uuid(),
  name: z.string().nullable(),
  email: z.email(),
  registeredCount: z.number(),
  attendedCount: z.number(),
  skippedCount: z.number(),
  pendingCount: z.number(),
  attendanceRate: z.number().nullable(),
});
export type StatsUserItem = z.infer<typeof statsUserItemSchema>;
