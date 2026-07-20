import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  DashboardStatsResponse,
  CheckInTrendPoint,
  PlanBreakdownItem,
} from '@repo/contracts';

const CHECK_IN_TREND_DAYS = 30;
const PLAN_BREAKDOWN_TOP_N = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: DatabaseService) {}

  async getStats(gymId: string): Promise<DashboardStatsResponse> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const trendStart = new Date(now);
    trendStart.setUTCDate(trendStart.getUTCDate() - (CHECK_IN_TREND_DAYS - 1));
    trendStart.setUTCHours(0, 0, 0, 0);

    const [
      totalMembers,
      totalActiveMembers,
      activeMembersData,
      expiringSoonSubs,
      currentOccupancy,
      gym,
      recentCheckIns,
      activeSubsForPlanBreakdown,
    ] = await Promise.all([
      this.prisma.member.count({ where: { gymId } }),

      this.prisma.member.count({
        where: {
          gymId,
          subscriptions: {
            some: { gymId, status: 'ACTIVE', endDate: { gte: now } },
          },
        },
      }),

      this.prisma.member.findMany({
        where: {
          gymId,
          subscriptions: {
            some: { gymId, status: 'ACTIVE', endDate: { gte: now } },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),

      this.prisma.subscription.findMany({
        where: {
          gymId,
          status: 'ACTIVE',
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
        select: {
          id: true,
          endDate: true,
          member: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { endDate: 'asc' },
      }),

      this.prisma.checkIn.count({
        where: { gymId, checkedOutAt: null },
      }),

      this.prisma.gym.findFirst({
        where: { id: gymId },
        select: { maxCapacity: true },
      }),

      this.prisma.checkIn.findMany({
        where: { gymId, checkedInAt: { gte: trendStart } },
        select: { checkedInAt: true },
      }),

      this.prisma.subscription.findMany({
        where: { gymId, status: 'ACTIVE', endDate: { gte: now } },
        select: { plan: { select: { name: true } } },
      }),
    ]);

    const expiringSoon = expiringSoonSubs.map((sub) => ({
      memberId: sub.member.id,
      memberName: sub.member.name,
      subscriptionId: sub.id,
      planName: sub.plan?.name ?? null,
      endDate: sub.endDate,
    }));

    const activeMembersList = activeMembersData.map((m) => ({
      memberId: m.id,
      memberName: m.name,
    }));

    // Zero-filled daily buckets so the trend line has no gaps, even on days
    // with no check-ins at all.
    const checkInCountsByDay = new Map<string, number>();
    for (const { checkedInAt } of recentCheckIns) {
      const day = checkedInAt.toISOString().slice(0, 10);
      checkInCountsByDay.set(day, (checkInCountsByDay.get(day) ?? 0) + 1);
    }
    const checkInTrend: CheckInTrendPoint[] = [];
    for (let i = 0; i < CHECK_IN_TREND_DAYS; i++) {
      const day = new Date(trendStart);
      day.setUTCDate(day.getUTCDate() + i);
      const key = day.toISOString().slice(0, 10);
      checkInTrend.push({ date: key, count: checkInCountsByDay.get(key) ?? 0 });
    }

    // Group active subscriptions by plan name, desc by count, folding
    // anything past the top N into "Other" so the chart never grows unbounded.
    const planCounts = new Map<string, number>();
    for (const { plan } of activeSubsForPlanBreakdown) {
      const name = plan?.name ?? 'No plan';
      planCounts.set(name, (planCounts.get(name) ?? 0) + 1);
    }
    const sortedPlans = [...planCounts.entries()].sort((a, b) => b[1] - a[1]);
    const subscriptionsByPlan: PlanBreakdownItem[] = sortedPlans
      .slice(0, PLAN_BREAKDOWN_TOP_N)
      .map(([planName, count]) => ({ planName, count }));
    const otherPlans = sortedPlans.slice(PLAN_BREAKDOWN_TOP_N);
    if (otherPlans.length > 0) {
      subscriptionsByPlan.push({
        planName: 'Other',
        count: otherPlans.reduce((sum, [, count]) => sum + count, 0),
      });
    }

    return {
      totalMembers,
      totalActiveMembers,
      activeMembersList,
      expiringSoon,
      currentOccupancy,
      maxCapacity: gym?.maxCapacity ?? null,
      checkInTrend,
      subscriptionsByPlan,
    };
  }
}
