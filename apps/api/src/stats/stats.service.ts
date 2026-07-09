import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { resolveEffectiveStatus, resolveOrganizationScope } from '../common';
import type {
  AttendanceStatus,
  StatsEventDetailResponse,
  StatsEventListQuery,
  StatsEventListResponse,
  StatsListQuery,
  StatsMemberListResponse,
  StatsOverviewResponse,
  StatsUserDetailResponse,
  StatsUserListResponse,
} from '@repo/contracts';

interface AttendanceTally {
  registeredCount: number;
  attendedCount: number;
  skippedCount: number;
  pendingCount: number;
  attendanceRate: number | null;
}

/** Defensive cap for overview past-attendee tallies (assumes orgs stay under this). */
const OVERVIEW_PAST_ATTENDEE_CAP = 10_000;
/** Defensive cap for presented events loaded per member in member stats. */
const MEMBER_PRESENTED_EVENTS_CAP = 500;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isUpcoming(startsAt: Date): boolean {
    return startsAt.getTime() > Date.now();
  }

  private tally(
    rows: { attendanceStatus: AttendanceStatus; startsAt: Date }[],
  ): AttendanceTally {
    let attended = 0;
    let skipped = 0;
    let pending = 0;

    for (const row of rows) {
      const status = resolveEffectiveStatus(row.attendanceStatus, row.startsAt);
      if (status === 'ATTENDED') attended += 1;
      else if (status === 'SKIPPED') skipped += 1;
      else pending += 1;
    }

    const resolved = attended + skipped;

    return {
      registeredCount: rows.length,
      attendedCount: attended,
      skippedCount: skipped,
      pendingCount: pending,
      attendanceRate: resolved > 0 ? attended / resolved : null,
    };
  }

  async getOverview(
    query: StatsListQuery,
    user: User,
  ): Promise<StatsOverviewResponse> {
    const organizationId = resolveOrganizationScope(user, query.organizationId);
    const eventWhere = organizationId ? { organizationId } : {};
    const attendeeWhere = organizationId ? { organizationId } : {};
    const memberWhere = organizationId ? { organizationId } : {};
    const now = new Date();

    const [
      memberCount,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      pastAttendees,
      topEventsRaw,
      topPresentersRaw,
      topAttendeesRaw,
    ] = await Promise.all([
      this.prisma.member.count({ where: memberWhere }),
      this.prisma.event.count({ where: eventWhere }),
      this.prisma.event.count({
        where: { ...eventWhere, startsAt: { gt: now } },
      }),
      this.prisma.eventAttendee.count({ where: attendeeWhere }),
      this.prisma.eventAttendee.findMany({
        where: { ...attendeeWhere, event: { startsAt: { lte: now } } },
        take: OVERVIEW_PAST_ATTENDEE_CAP,
        select: {
          attendanceStatus: true,
          event: { select: { startsAt: true } },
        },
      }),
      this.prisma.event.findMany({
        where: eventWhere,
        orderBy: { attendees: { _count: 'desc' } },
        take: 5,
        select: {
          id: true,
          eventName: true,
          startsAt: true,
          _count: { select: { attendees: true } },
        },
      }),
      this.prisma.member.findMany({
        where: memberWhere,
        orderBy: { presentedEvents: { _count: 'desc' } },
        take: 5,
        select: {
          id: true,
          username: true,
          _count: { select: { presentedEvents: true } },
        },
      }),
      this.prisma.eventAttendee.groupBy({
        by: ['userId'],
        where: { ...attendeeWhere, attendanceStatus: 'ATTENDED' },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    const pastEvents = totalEvents - upcomingEvents;

    const pastTally = this.tally(
      pastAttendees.map((row) => ({
        attendanceStatus: row.attendanceStatus,
        startsAt: row.event.startsAt,
      })),
    );
    const registeredPast = pastAttendees.length;
    const noShowRate =
      registeredPast > 0 ? pastTally.skippedCount / registeredPast : null;
    const avgRegistrationsPerPastEvent =
      pastEvents > 0 ? registeredPast / pastEvents : null;

    const topAttendeeUsers = await this.prisma.user.findMany({
      where: { id: { in: topAttendeesRaw.map((row) => row.userId) } },
      select: { id: true, name: true, email: true },
    });
    const userById = new Map(topAttendeeUsers.map((u) => [u.id, u]));

    return {
      memberCount,
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalRegistrations,
      attendanceRate: pastTally.attendanceRate,
      noShowRate,
      avgRegistrationsPerPastEvent,
      topEventsByRegistrations: topEventsRaw.map((event) => ({
        eventId: event.id,
        eventName: event.eventName,
        startsAt: event.startsAt,
        registeredCount: event._count.attendees,
      })),
      topPresentersByEvents: topPresentersRaw
        .filter((member) => member._count.presentedEvents > 0)
        .map((member) => ({
          memberId: member.id,
          username: member.username,
          eventsHosted: member._count.presentedEvents,
        })),
      topAttendees: topAttendeesRaw.map((row) => {
        const attendee = userById.get(row.userId);
        return {
          userId: row.userId,
          name: attendee?.name ?? null,
          email: attendee?.email ?? null,
          attendedCount: row._count.userId,
        };
      }),
    };
  }

  async getEventStats(
    query: StatsEventListQuery,
    user: User,
  ): Promise<StatsEventListResponse> {
    const {
      page = 1,
      limit = 20,
      organizationId: requestedOrgId,
      upcoming,
    } = query;
    const skip = (page - 1) * limit;
    const organizationId = resolveOrganizationScope(user, requestedOrgId);
    const now = new Date();

    const where = {
      ...(organizationId ? { organizationId } : {}),
      ...(upcoming === true ? { startsAt: { gt: now } } : {}),
      ...(upcoming === false ? { startsAt: { lte: now } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'desc' },
        select: {
          id: true,
          eventName: true,
          startsAt: true,
          presenter: { select: { id: true, username: true } },
          attendees: { select: { attendanceStatus: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const events = rows.map((event) => {
      const isUpcoming = this.isUpcoming(event.startsAt);
      const tally = this.tally(
        event.attendees.map((attendee) => ({
          attendanceStatus: attendee.attendanceStatus,
          startsAt: event.startsAt,
        })),
      );

      return {
        eventId: event.id,
        eventName: event.eventName,
        startsAt: event.startsAt,
        isUpcoming,
        presenter: event.presenter ?? null,
        registeredCount: tally.registeredCount,
        attendedCount: tally.attendedCount,
        skippedCount: tally.skippedCount,
        pendingCount: tally.pendingCount,
        attendanceRate: isUpcoming ? null : tally.attendanceRate,
      };
    });

    return { events, total };
  }

  async getEventStat(
    eventId: string,
    user: User,
  ): Promise<StatsEventDetailResponse> {
    const organizationId = resolveOrganizationScope(user);

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        eventName: true,
        startsAt: true,
        presenter: { select: { id: true, username: true } },
        attendees: { select: { attendanceStatus: true } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const isUpcoming = this.isUpcoming(event.startsAt);
    const tally = this.tally(
      event.attendees.map((attendee) => ({
        attendanceStatus: attendee.attendanceStatus,
        startsAt: event.startsAt,
      })),
    );

    return {
      eventId: event.id,
      eventName: event.eventName,
      startsAt: event.startsAt,
      isUpcoming,
      presenter: event.presenter ?? null,
      registeredCount: tally.registeredCount,
      attendedCount: tally.attendedCount,
      skippedCount: tally.skippedCount,
      pendingCount: tally.pendingCount,
      attendanceRate: isUpcoming ? null : tally.attendanceRate,
    };
  }

  async getUserStats(
    query: StatsListQuery,
    user: User,
  ): Promise<StatsUserListResponse> {
    const { page = 1, limit = 20, organizationId: requestedOrgId } = query;
    const skip = (page - 1) * limit;
    const organizationId = resolveOrganizationScope(user, requestedOrgId);

    const attendeeFilter = organizationId ? { organizationId } : {};
    const where = { eventAttendees: { some: attendeeFilter } };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          eventAttendees: {
            where: attendeeFilter,
            select: {
              attendanceStatus: true,
              event: { select: { startsAt: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const rows = users.map((u) => {
      const tally = this.tally(
        u.eventAttendees.map((attendee) => ({
          attendanceStatus: attendee.attendanceStatus,
          startsAt: attendee.event.startsAt,
        })),
      );

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        registeredCount: tally.registeredCount,
        attendedCount: tally.attendedCount,
        skippedCount: tally.skippedCount,
        pendingCount: tally.pendingCount,
        attendanceRate: tally.attendanceRate,
      };
    });

    return { users: rows, total };
  }

  async getUserStat(
    userId: string,
    query: StatsListQuery,
    user: User,
  ): Promise<StatsUserDetailResponse> {
    const organizationId = resolveOrganizationScope(user, query.organizationId);
    const attendeeFilter = organizationId ? { organizationId } : {};

    const target = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(organizationId ? { eventAttendees: { some: attendeeFilter } } : {}),
      },
      select: { id: true, name: true, email: true },
    });

    if (!target) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const attendeeRows = await this.prisma.eventAttendee.findMany({
      where: { userId, ...attendeeFilter },
      orderBy: { event: { startsAt: 'desc' } },
      select: {
        attendanceStatus: true,
        event: { select: { id: true, eventName: true, startsAt: true } },
      },
    });

    const tally = this.tally(
      attendeeRows.map((row) => ({
        attendanceStatus: row.attendanceStatus,
        startsAt: row.event.startsAt,
      })),
    );

    return {
      userId: target.id,
      name: target.name,
      email: target.email,
      registeredCount: tally.registeredCount,
      attendedCount: tally.attendedCount,
      skippedCount: tally.skippedCount,
      pendingCount: tally.pendingCount,
      attendanceRate: tally.attendanceRate,
      events: attendeeRows.map((row) => ({
        eventId: row.event.id,
        eventName: row.event.eventName,
        startsAt: row.event.startsAt,
        attendanceStatus: resolveEffectiveStatus(
          row.attendanceStatus,
          row.event.startsAt,
        ),
      })),
    };
  }

  async getMemberStats(
    query: StatsListQuery,
    user: User,
  ): Promise<StatsMemberListResponse> {
    const { page = 1, limit = 20, organizationId: requestedOrgId } = query;
    const skip = (page - 1) * limit;
    const organizationId = resolveOrganizationScope(user, requestedOrgId);
    const where = organizationId ? { organizationId } : {};

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          role: true,
          presentedEvents: {
            take: MEMBER_PRESENTED_EVENTS_CAP,
            select: {
              startsAt: true,
              attendees: { select: { attendanceStatus: true } },
            },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    const rows = members.map((member) => {
      const eventsHosted = member.presentedEvents.length;
      let upcomingHosted = 0;
      let totalRegistrations = 0;
      const pastRates: number[] = [];

      for (const event of member.presentedEvents) {
        totalRegistrations += event.attendees.length;

        if (this.isUpcoming(event.startsAt)) {
          upcomingHosted += 1;
          continue;
        }

        const tally = this.tally(
          event.attendees.map((attendee) => ({
            attendanceStatus: attendee.attendanceStatus,
            startsAt: event.startsAt,
          })),
        );
        if (tally.attendanceRate !== null) {
          pastRates.push(tally.attendanceRate);
        }
      }

      const avgAttendanceRate =
        pastRates.length > 0
          ? pastRates.reduce((sum, rate) => sum + rate, 0) / pastRates.length
          : null;

      return {
        memberId: member.id,
        username: member.username,
        role: member.role,
        eventsHosted,
        upcomingHosted,
        pastHosted: eventsHosted - upcomingHosted,
        totalRegistrationsAcrossEvents: totalRegistrations,
        avgRegistrationsPerEvent:
          eventsHosted > 0 ? totalRegistrations / eventsHosted : 0,
        avgAttendanceRate,
      };
    });

    return { members: rows, total };
  }
}
