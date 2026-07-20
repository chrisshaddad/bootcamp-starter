import { z } from 'zod';
import { dateSchema } from '../common';

export const expiringSoonItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
  subscriptionId: z.string().uuid(),
  planName: z.string().nullable(),
  endDate: dateSchema,
});

export type ExpiringSoonItem = z.infer<typeof expiringSoonItemSchema>;

export const activeMemberItemSchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
});

export type ActiveMemberItem = z.infer<typeof activeMemberItemSchema>;

export const checkInTrendPointSchema = z.object({
  /** Calendar date, YYYY-MM-DD, gym-local midnight-to-midnight bucket */
  date: z.string(),
  count: z.number().int(),
});

export type CheckInTrendPoint = z.infer<typeof checkInTrendPointSchema>;

export const planBreakdownItemSchema = z.object({
  planName: z.string(),
  count: z.number().int(),
});

export type PlanBreakdownItem = z.infer<typeof planBreakdownItemSchema>;

export const dashboardStatsResponseSchema = z.object({
  totalMembers: z.number().int(),
  totalActiveMembers: z.number().int(),
  activeMembersList: z.array(activeMemberItemSchema),
  expiringSoon: z.array(expiringSoonItemSchema),
  currentOccupancy: z.number().int(),
  maxCapacity: z.number().int().nullable(),
  /** Daily check-in counts for the last 30 days, oldest first, zero-filled */
  checkInTrend: z.array(checkInTrendPointSchema),
  /** Active-subscription count grouped by plan, desc, capped to top 5 + "Other" */
  subscriptionsByPlan: z.array(planBreakdownItemSchema),
});

export type DashboardStatsResponse = z.infer<
  typeof dashboardStatsResponseSchema
>;
