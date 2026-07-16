import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { ATTENDANCE_GRACE_PERIOD_MS } from '../common/attendance';
import { resolveOrganizationScope } from '../common/organization-scope';
import type {
  EventAttendanceUpdateRequest,
  EventAttendanceUpdateResponse,
  EventAttendeeListResponse,
  EventCreateRequest,
  EventDetailResponse,
  EventListQuery,
  EventListResponse,
  EventRegisterResponse,
  EventUpdateRequest,
  PublicEventDetailResponse,
  PublicEventListQuery,
  PublicEventListResponse,
} from '@repo/contracts';

type EventStatusValue = 'SCHEDULED' | 'CANCELLED';

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
    status: true,
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

  private getAttendanceAutoSkipDeadline(startsAt: Date): Date {
    return new Date(startsAt.getTime() + ATTENDANCE_GRACE_PERIOD_MS);
  }

  private assertEventHasStarted(startsAt: Date): void {
    if (this.isUpcoming(startsAt)) {
      throw new BadRequestException(
        'Attendance cannot be updated before the event starts',
      );
    }
  }

  private async autoSkipPendingAttendees(
    eventId: string,
    organizationId: string,
    startsAt: Date,
  ): Promise<void> {
    const deadline = this.getAttendanceAutoSkipDeadline(startsAt);
    if (Date.now() < deadline.getTime()) {
      return;
    }

    const result = await this.prisma.eventAttendee.updateMany({
      where: {
        eventId,
        organizationId,
        attendanceStatus: 'PENDING',
      },
      data: {
        attendanceStatus: 'SKIPPED',
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-skipped ${result.count} pending attendee(s) for event ${eventId}`,
      );
    }
  }

  private async getOrgMembership(userId: string, organizationId: string) {
    return this.prisma.member.findFirst({
      where: { userId, organizationId },
      select: { id: true, role: true },
    });
  }

  private async getPresenterMemberId(
    userId: string,
    organizationId: string,
  ): Promise<string | null> {
    const membership = await this.getOrgMembership(userId, organizationId);
    if (membership && membership.role === 'PRESENTER') {
      return membership.id;
    }
    return null;
  }

  private async assertPresenterInOrganization(
    presenterId: string,
    organizationId: string,
  ): Promise<void> {
    const presenter = await this.prisma.member.findFirst({
      where: {
        id: presenterId,
        organizationId,
      },
      select: { id: true },
    });

    if (!presenter) {
      throw new BadRequestException(
        'Presenter must be a member of the same organization',
      );
    }
  }

  private async evaluateRegistrationEligibility(
    user: Pick<User, 'id' | 'role'>,
    event: {
      organizationId: string;
      startsAt: Date;
      presenterId: string | null;
      status: EventStatusValue;
    },
  ): Promise<boolean> {
    if (user.role !== 'MEMBER') {
      return false;
    }

    if (event.status === 'CANCELLED') {
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
      status: EventStatusValue;
    },
  ): Promise<void> {
    if (user.role !== 'MEMBER') {
      throw new ForbiddenException(
        'Only organization members can register as event attendees',
      );
    }

    if (event.status === 'CANCELLED') {
      throw new BadRequestException(
        'Registration is not available for cancelled events',
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
      status: EventStatusValue;
    },
  ): Promise<boolean> {
    return this.evaluateRegistrationEligibility(user, event);
  }

  private async canManageAttendance(
    user: User,
    event: {
      organizationId: string;
      presenterId: string | null;
    },
  ): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN') {
      return true;
    }

    if (user.role !== 'MEMBER') {
      return false;
    }

    const presenterMemberId = await this.getPresenterMemberId(
      user.id,
      event.organizationId,
    );

    return (
      presenterMemberId !== null && event.presenterId === presenterMemberId
    );
  }

  private async assertCanManageAttendance(
    user: User,
    event: {
      organizationId: string;
      presenterId: string | null;
    },
  ): Promise<void> {
    if (!(await this.canManageAttendance(user, event))) {
      throw new ForbiddenException(
        'You do not have permission to manage attendance for this event',
      );
    }
  }

  private async getScopedEvent(eventId: string, user: User) {
    const organizationId =
      user.role === 'SUPER_ADMIN' ? undefined : resolveOrganizationScope(user);

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        presenterId: true,
        startsAt: true,
        status: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  private async toDetailResponse(
    event: {
      id: string;
      eventName: string;
      presenterId: string | null;
      organizationId: string;
      startsAt: Date;
      status: EventStatusValue;
      createdAt: Date;
      updatedAt: Date;
      presenter: { id: string; username: string } | null;
      _count: { attendees: number };
    },
    user: User,
  ): Promise<EventDetailResponse> {
    const registration = await this.prisma.eventAttendee.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
      },
    });

    const { presenter, _count, ...rest } = event;
    const isRegistered = !!registration;
    const isUpcoming = this.isUpcoming(event.startsAt);
    const canManageAttendance = await this.canManageAttendance(user, event);

    return {
      ...rest,
      presenter: presenter ?? null,
      isRegistered,
      isUpcoming,
      canRegister: !isRegistered && (await this.canUserRegister(user, event)),
      canManageAttendance,
      canUpdateAttendance: canManageAttendance && !isUpcoming,
      attendeeCount: _count.attendees,
    };
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

  async findPublicAll(
    query: PublicEventListQuery,
  ): Promise<PublicEventListResponse> {
    const { page = 1, limit = 20, organizationId } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {
      status: 'SCHEDULED' as const,
      startsAt: { gt: now },
      ...(organizationId ? { organizationId } : {}),
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
          startsAt: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
            },
          },
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

    this.logger.log(`Listed ${rows.length} public events (total: ${total})`);

    return {
      events: rows.map(({ organization, presenter, ...event }) => ({
        ...event,
        organizationName: organization.name,
        presenter: presenter ?? null,
      })),
      total,
    };
  }

  async findPublicOne(id: string): Promise<PublicEventDetailResponse> {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        status: 'SCHEDULED',
        startsAt: { gt: new Date() },
      },
      select: {
        id: true,
        eventName: true,
        startsAt: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
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
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    const { organization, presenter, _count, ...rest } = event;

    return {
      ...rest,
      organizationName: organization.name,
      presenter: presenter ?? null,
      attendeeCount: _count.attendees,
    };
  }

  async findAll(query: EventListQuery, user: User): Promise<EventListResponse> {
    const {
      page = 1,
      limit = 20,
      organizationId: requestedOrgId,
      upcoming,
      hostedByMe,
    } = query;
    const skip = (page - 1) * limit;

    const organizationId = resolveOrganizationScope(user, requestedOrgId);

    let presenterMemberId: string | null = null;
    if (user.role === 'MEMBER' && organizationId) {
      presenterMemberId = await this.getPresenterMemberId(
        user.id,
        organizationId,
      );
    }

    const where = {
      ...(organizationId ? { organizationId } : {}),
      ...(hostedByMe === true && presenterMemberId
        ? { presenterId: presenterMemberId }
        : {}),
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
          status: true,
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
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const registeredEventIds = await this.getRegisteredEventIds(
      user.id,
      rows.map((row) => row.id),
    );

    this.logger.log(`Listed ${rows.length} events (total: ${total})`);

    const events = rows.map(({ presenter, startsAt, _count, ...event }) => ({
      ...event,
      startsAt,
      presenter: presenter ?? null,
      isRegistered: registeredEventIds.has(event.id),
      isUpcoming: this.isUpcoming(startsAt),
      ...(presenterMemberId
        ? { hostedByMe: event.presenterId === presenterMemberId }
        : {}),
      attendeeCount: _count.attendees,
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

    return this.toDetailResponse(event, user);
  }

  async create(
    body: EventCreateRequest,
    user: User,
  ): Promise<EventDetailResponse> {
    const organizationId = resolveOrganizationScope(user, body.organizationId);

    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required when creating an event',
      );
    }

    if (body.presenterId) {
      await this.assertPresenterInOrganization(
        body.presenterId,
        organizationId,
      );
    }

    const event = await this.prisma.event.create({
      data: {
        eventName: body.eventName,
        startsAt: new Date(body.startsAt),
        organizationId,
        presenterId: body.presenterId ?? null,
        status: 'SCHEDULED',
      },
      select: this.eventSelect,
    });

    this.logger.log(`Created event ${event.id} in org ${organizationId}`);
    return this.toDetailResponse(event, user);
  }

  async update(
    id: string,
    body: EventUpdateRequest,
    user: User,
  ): Promise<EventDetailResponse> {
    const scoped = await this.getScopedEvent(id, user);

    if (body.presenterId) {
      await this.assertPresenterInOrganization(
        body.presenterId,
        scoped.organizationId,
      );
    }

    const event = await this.prisma.event.update({
      where: { id: scoped.id },
      data: {
        ...(body.eventName !== undefined ? { eventName: body.eventName } : {}),
        ...(body.startsAt !== undefined
          ? { startsAt: new Date(body.startsAt) }
          : {}),
        ...(body.presenterId !== undefined
          ? { presenterId: body.presenterId }
          : {}),
      },
      select: this.eventSelect,
    });

    this.logger.log(`Updated event ${event.id}`);
    return this.toDetailResponse(event, user);
  }

  async cancel(id: string, user: User): Promise<EventDetailResponse> {
    const scoped = await this.getScopedEvent(id, user);

    const event = await this.prisma.event.update({
      where: { id: scoped.id },
      data: { status: 'CANCELLED' },
      select: this.eventSelect,
    });

    this.logger.log(`Cancelled event ${event.id}`);
    return this.toDetailResponse(event, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const scoped = await this.getScopedEvent(id, user);

    await this.prisma.event.delete({
      where: { id: scoped.id },
    });

    this.logger.log(`Deleted event ${scoped.id}`);
  }

  async findAttendees(
    eventId: string,
    user: User,
  ): Promise<EventAttendeeListResponse> {
    const event = await this.getScopedEvent(eventId, user);
    await this.autoSkipPendingAttendees(
      event.id,
      event.organizationId,
      event.startsAt,
    );

    const rows = await this.prisma.eventAttendee.findMany({
      where: {
        eventId,
        organizationId: event.organizationId,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        attendanceStatus: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    const attendees = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      attendanceStatus: row.attendanceStatus,
      registeredAt: row.createdAt,
    }));

    return { attendees, total: attendees.length };
  }

  async updateAttendance(
    eventId: string,
    attendeeUserId: string,
    body: EventAttendanceUpdateRequest,
    user: User,
  ): Promise<EventAttendanceUpdateResponse> {
    const event = await this.getScopedEvent(eventId, user);
    await this.assertCanManageAttendance(user, event);
    this.assertEventHasStarted(event.startsAt);
    await this.autoSkipPendingAttendees(
      event.id,
      event.organizationId,
      event.startsAt,
    );

    const attendee = await this.prisma.eventAttendee.findFirst({
      where: {
        eventId,
        userId: attendeeUserId,
        organizationId: event.organizationId,
      },
      select: {
        id: true,
        userId: true,
        attendanceStatus: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!attendee) {
      throw new NotFoundException(
        `Attendee with user ID ${attendeeUserId} not found for this event`,
      );
    }

    const updated = await this.prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: { attendanceStatus: body.attendanceStatus },
      select: {
        id: true,
        userId: true,
        attendanceStatus: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Attendance for user ${attendeeUserId} on event ${eventId} set to ${body.attendanceStatus}`,
    );

    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      name: updated.user.name,
      attendanceStatus: updated.attendanceStatus,
      registeredAt: updated.createdAt,
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
