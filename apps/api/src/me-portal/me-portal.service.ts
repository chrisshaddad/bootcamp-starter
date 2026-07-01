import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
  MeBookingListResponse,
  MeBookingResponse,
  BookingStatus,
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

const ME_BOOKING_SELECT = {
  id: true,
  gymId: true,
  sessionId: true,
  memberId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  session: {
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      status: true,
      instructor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

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

  /** Return the portal member's bookings (paginated, sorted by session start date) */
  async getBookings(
    userId: string,
    gymId: string,
    page: number = 1,
    limit: number = 25,
    status?: BookingStatus,
  ): Promise<MeBookingListResponse> {
    const member = await this.resolveMember(userId, gymId);
    const skip = (page - 1) * limit;

    const where = {
      memberId: member.id,
      gymId,
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where,
        orderBy: { session: { startsAt: 'desc' } },
        skip,
        take: limit,
        select: ME_BOOKING_SELECT,
      }),
      this.prisma.sessionBooking.count({ where }),
    ]);

    return {
      bookings: bookings as unknown as MeBookingResponse[],
      total,
    };
  }

  /** Cancel an upcoming booking for the logged-in portal member */
  async cancelBooking(
    userId: string,
    gymId: string,
    bookingId: string,
  ): Promise<MeBookingResponse> {
    const member = await this.resolveMember(userId, gymId);

    const booking = await this.prisma.sessionBooking.findFirst({
      where: { id: bookingId, memberId: member.id, gymId },
      include: { session: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.session.startsAt < new Date()) {
      throw new BadRequestException(
        'Cannot cancel a session that has already started',
      );
    }

    await this.prisma.sessionBooking.updateMany({
      where: { id: bookingId, memberId: member.id, gymId },
      data: { status: 'CANCELLED' },
    });

    const updated = await this.prisma.sessionBooking.findFirst({
      where: { id: bookingId, memberId: member.id, gymId },
      select: ME_BOOKING_SELECT,
    });

    return updated as unknown as MeBookingResponse;
  }
}
