import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
} from '@repo/contracts';

const SUBSCRIPTION_SELECT = {
  id: true,
  gymId: true,
  memberId: true,
  planId: true,
  startDate: true,
  endDate: true,
  price: true,
  status: true,
  plan: {
    select: {
      id: true,
      name: true,
      durationDays: true,
      isActive: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

/** Auto-generated docstring */
@Injectable()
export class MePortalService {
  constructor(private readonly prisma: DatabaseService) {}

  /** Resolve the Member record for the logged-in portal user */
  private async resolveMember(userId: string, gymId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, gymId },
    });
    if (!member) {
      throw new NotFoundException('Member record not found for this user');
    }
    return member;
  }

  /** Return the portal member's profile */
  async getProfile(userId: string, gymId: string): Promise<MeProfileResponse> {
    const member = await this.resolveMember(userId, gymId);
    return {
      id: member.id,
      gymId: member.gymId,
      name: member.name,
      email: member.email,
      phoneNumber: member.phoneNumber,
      dateOfBirth: member.dateOfBirth,
      status: member.status,
      joinedAt: member.joinedAt,
    };
  }

  /** Return the portal member's subscriptions (all statuses, newest first) */
  async getSubscriptions(
    userId: string,
    gymId: string,
  ): Promise<SubscriptionListResponse> {
    const member = await this.resolveMember(userId, gymId);

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { memberId: member.id, gymId },
        orderBy: { startDate: 'desc' },
        select: SUBSCRIPTION_SELECT,
      }),
      this.prisma.subscription.count({
        where: { memberId: member.id, gymId },
      }),
    ]);

    return { subscriptions, total };
  }

  /** Return active plans available in the member's gym */
  async getPlans(userId: string, gymId: string): Promise<PlanListResponse> {
    await this.resolveMember(userId, gymId);

    const [plans, total] = await Promise.all([
      this.prisma.membershipPlan.findMany({
        where: { gymId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.membershipPlan.count({ where: { gymId, isActive: true } }),
    ]);

    return { plans, total };
  }
}
