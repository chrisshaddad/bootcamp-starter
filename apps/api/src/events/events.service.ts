import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { resolveOrganizationScope } from '../common/organization-scope';
import type {
  EventDetailResponse,
  EventListQuery,
  EventListResponse,
  EventRegisterResponse,
} from '@repo/contracts';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private eventSelect = {
    id: true,
    eventName: true,
    presenterId: true,
    organizationId: true,
    startsAt: true,
    createdAt: true,
    updatedAt: true,
    presenter: {
      select: {
        id: true,
        username: true,
      },
    },
    _count: {
      select: {
        attendees: true,
      },
    },
  } as const;

  private isUpcoming(startsAt: Date): boolean {
    return startsAt.getTime() > Date.now();
  }

  private async getOrgMembership(userId: string, organizationId: string) {
    return this.prisma.member.findFirst({
      where: { userId, organizationId },
      select: { id: true, role: true },
    });
  }

  private async evaluateRegistrationEligibility(
    user: Pick<User, 'id' | 'role'>,
    event: {
      organizationId: string;
      startsAt: Date;
      presenterId: string | null;
    },
  ): Promise<boolean> {
    if (user.role !== 'MEMBER') {
      return false;
    }

    if (!this.isUpcoming(event.startsAt)) {
      return false;
    }

    const membership = await this.getOrgMembership(
      user.id,
      event.organizationId,
    );

    if (!membership) {
      return true;
    }

    if (membership.role === 'ADMIN') {
      return false;
    }

    if (membership.role === 'PRESENTER') {
      return event.presenterId !== membership.id;
    }

    return true;
  }

  private async assertCanRegister(
    user: Pick<User, 'id' | 'role'>,
    event: {
      organizationId: string;
      startsAt: Date;
      presenterId: string | null;
    },
  ): Promise<void> {
    if (user.role !== 'MEMBER') {
      throw new ForbiddenException(
        'Only organization members can register as event attendees',
      );
    }

    if (!this.isUpcoming(event.startsAt)) {
      throw new BadRequestException(
        'Registration is only available for upcoming events',
      );
    }

    const membership = await this.getOrgMembership(
      user.id,
      event.organizationId,
    );

    if (membership?.role === 'ADMIN') {
      throw new ForbiddenException(
        'Organization admins cannot register as event attendees',
      );
    }

    if (
      membership?.role === 'PRESENTER' &&
      event.presenterId === membership.id
    ) {
      throw new ForbiddenException(
        'Presenters cannot register for events they are hosting',
      );
    }
  }

  private async canUserRegister(
    user: Pick<User, 'id' | 'role'>,
    event: {
      organizationId: string;
      startsAt: Date;
      presenterId: string | null;
    },
  ): Promise<boolean> {
    return this.evaluateRegistrationEligibility(user, event);
  }

  private async getRegisteredEventIds(
    userId: string,
    eventIds: string[],
  ): Promise<Set<string>> {
    if (eventIds.length === 0) {
      return new Set();
    }

    const registrations = await this.prisma.eventAttendee.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
      select: { eventId: true },
    });

    return new Set(registrations.map((registration) => registration.eventId));
  }

  async findAll(query: EventListQuery, user: User): Promise<EventListResponse> {
    const {
      page = 1,
      limit = 20,
      organizationId: requestedOrgId,
      upcoming,
    } = query;
    const skip = (page - 1) * limit;

    const organizationId = resolveOrganizationScope(user, requestedOrgId);
    const where = {
      ...(organizationId ? { organizationId } : {}),
      ...(upcoming === true ? { startsAt: { gt: new Date() } } : {}),
      ...(upcoming === false ? { startsAt: { lte: new Date() } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        select: {
          id: true,
          eventName: true,
          presenterId: true,
          organizationId: true,
          startsAt: true,
          presenter: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const registeredEventIds = await this.getRegisteredEventIds(
      user.id,
      rows.map((row) => row.id),
    );

    this.logger.log(`Listed ${rows.length} events (total: ${total})`);

    const events = rows.map(({ presenter, startsAt, ...event }) => ({
      ...event,
      startsAt,
      presenter: presenter ?? null,
      isRegistered: registeredEventIds.has(event.id),
      isUpcoming: this.isUpcoming(startsAt),
    }));

    return { events, total };
  }

  async findOne(id: string, user: User): Promise<EventDetailResponse> {
    const organizationId =
      user.role === 'SUPER_ADMIN' ? undefined : resolveOrganizationScope(user);

    const event = await this.prisma.event.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      select: this.eventSelect,
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const registration = await this.prisma.eventAttendee.findFirst({
      where: {
        eventId: id,
        userId: user.id,
      },
    });

    const { presenter, _count, ...rest } = event;
    const isRegistered = !!registration;
    const isUpcoming = this.isUpcoming(event.startsAt);

    return {
      ...rest,
      presenter: presenter ?? null,
      isRegistered,
      isUpcoming,
      canRegister: !isRegistered && (await this.canUserRegister(user, event)),
      attendeeCount: _count.attendees,
    };
  }

  async register(eventId: string, user: User): Promise<EventRegisterResponse> {
    const organizationId =
      user.role === 'SUPER_ADMIN' ? undefined : resolveOrganizationScope(user);

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    await this.assertCanRegister(user, event);

    try {
      await this.prisma.eventAttendee.create({
        data: {
          eventId,
          userId: user.id,
          organizationId: event.organizationId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'You are already registered for this event',
        );
      }
      throw error;
    }

    this.logger.log(`User ${user.id} registered for event ${eventId}`);

    return {
      message: 'Successfully registered for event',
      eventId,
      isRegistered: true,
    };
  }
}
