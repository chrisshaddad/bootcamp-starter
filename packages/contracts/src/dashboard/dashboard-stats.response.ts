import { z } from 'zod';
import { dateSchema } from '../common';

export const expiringSoonItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
  subscriptionId: z.string().uuid(),
  endDate: dateSchema,
});

export type ExpiringSoonItem = z.infer<typeof expiringSoonItemSchema>;

export const dashboardStatsResponseSchema = z.object({
  totalMembers: z.number().int(),
  totalActiveMembers: z.number().int(),
  expiringSoon: z.array(expiringSoonItemSchema),
  currentOccupancy: z.number().int(),
  maxCapacity: z.number().int().nullable(),
});

export type DashboardStatsResponse = z.infer<
  typeof dashboardStatsResponseSchema
>;
