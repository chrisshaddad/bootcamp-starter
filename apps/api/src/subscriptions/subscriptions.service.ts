import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  SubscriptionListResponse,
  SubscriptionResponse,
  SubscriptionCreateRequest,
  SubscriptionListQuery,
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

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all subscriptions for a member, scoped to the caller's gym */
  async findAllByMember(
    memberId: string,
    gymId: string,
    query: SubscriptionListQuery,
  ): Promise<SubscriptionListResponse> {
    const { page = 1, limit = 20 } = query;

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const skip = (page - 1) * limit;
    const where = {
      memberId,
      gymId,
      ...(query.status !== undefined ? { status: query.status } : {}),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        select: SUBSCRIPTION_SELECT,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  /** Create a subscription for a member, computing endDate and snapshotting the plan price */
  async create(
    gymId: string,
    dto: SubscriptionCreateRequest,
  ): Promise<SubscriptionResponse> {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
    }

    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: dto.planId, gymId },
      select: { id: true, price: true, durationDays: true, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${dto.planId} not found`);
    }
    if (!plan.isActive) {
      throw new BadRequestException(
        'Cannot create a subscription with an inactive plan',
      );
    }

    const existing = await this.prisma.subscription.findFirst({
      where: {
        memberId: dto.memberId,
        planId: dto.planId,
        gymId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Member already has an active subscription for this plan',
      );
    }

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);

    // Compute endDate by adding durationDays in UTC to avoid DST drift
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + plan.durationDays);

    try {
      return await this.prisma.subscription.create({
        data: {
          gymId,
          memberId: dto.memberId,
          planId: dto.planId,
          startDate,
          endDate,
          price: plan.price,
          status: 'ACTIVE',
        },
        select: SUBSCRIPTION_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Member already has an active subscription for this plan',
        );
      }
      throw err;
    }
  }

  /** Cancel an active subscription, scoped to the caller's gym */
  async cancel(id: string, gymId: string): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id, gymId },
      select: { id: true, status: true },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Subscription is already ${subscription.status.toLowerCase()} and cannot be cancelled`,
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: SUBSCRIPTION_SELECT,
    });
  }
}
