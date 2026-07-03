import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { DashboardStatsResponse } from '@repo/contracts';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: DatabaseService) {}

  async getStats(gymId: string): Promise<DashboardStatsResponse> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const [
      totalMembers,
      totalActiveMembers,
      activeMembersData,
      expiringSoonSubs,
      currentOccupancy,
      gym,
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
    ]);

    const expiringSoon = expiringSoonSubs.map((sub) => ({
      memberId: sub.member.id,
      memberName: sub.member.name,
      subscriptionId: sub.id,
      endDate: sub.endDate,
    }));

    const activeMembersList = activeMembersData.map((m) => ({
      memberId: m.id,
      memberName: m.name,
    }));

    return {
      totalMembers,
      totalActiveMembers,
      activeMembersList,
      expiringSoon,
      currentOccupancy,
      maxCapacity: gym?.maxCapacity ?? null,
    };
  }
}
