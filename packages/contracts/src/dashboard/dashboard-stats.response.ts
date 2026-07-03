import { z } from 'zod';
import { dateSchema } from '../common';

export const expiringSoonItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
  subscriptionId: z.string().uuid(),
  endDate: dateSchema,
});

export type ExpiringSoonItem = z.infer<typeof expiringSoonItemSchema>;

export const activeMemberItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
});

export type ActiveMemberItem = z.infer<typeof activeMemberItemSchema>;

export const dashboardStatsResponseSchema = z.object({
  totalMembers: z.number().int(),
  totalActiveMembers: z.number().int(),
  activeMembersList: z.array(activeMemberItemSchema),
  expiringSoon: z.array(expiringSoonItemSchema),
  currentOccupancy: z.number().int(),
  maxCapacity: z.number().int().nullable(),
});

export type DashboardStatsResponse = z.infer<
  typeof dashboardStatsResponseSchema
>;
