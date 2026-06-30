import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

import type {
  BookingListResponse,
  BookingResponse,
  BookingCreateRequest,
} from '@repo/contracts';

/** Prisma select shape reused across all booking queries */
const BOOKING_SELECT = {
  id: true,
  gymId: true,
  sessionId: true,
  memberId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: DatabaseService) {}

  /** List all bookings for a specific session, scoped to the caller's gym */
  async findAllBySession(
    gymId: string,
    sessionId: string,
  ): Promise<BookingListResponse> {
    // Verify the session belongs to this gym
    const session = await this.prisma.gymSession.findFirst({
      where: { id: sessionId, gymId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const bookings = await this.prisma.sessionBooking.findMany({
      where: { sessionId, gymId },
      orderBy: { createdAt: 'desc' },
      select: BOOKING_SELECT,
    });

    return bookings as unknown as BookingListResponse;
  }

  /** Create a booking — reject if session is full, cancelled, past, or member already booked */
  async create(
    gymId: string,
    dto: BookingCreateRequest,
  ): Promise<BookingResponse> {
    // 1. Verify session belongs to gym and is bookable
    const session = await this.prisma.gymSession.findFirst({
      where: { id: dto.sessionId, gymId },
      select: {
        id: true,
        capacity: true,
        status: true,
        startsAt: true,
        endsAt: true,
        _count: {
          select: {
            bookings: {
              where: { status: { not: 'CANCELLED' } },
            },
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException(`Session with ID ${dto.sessionId} not found`);
    }

    // 2. Guard: session must be SCHEDULED
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Cannot book a ${session.status.toLowerCase()} session`,
      );
    }

    // 3. Guard: session must not be in the past
    if (session.startsAt < new Date()) {
      throw new BadRequestException(
        'Cannot book a session that has already started',
      );
    }

    // 4. Guard: capacity check — count only non-cancelled bookings
    if (session._count.bookings >= session.capacity) {
      throw new BadRequestException('Session is full — no available slots');
    }

    // 5. Verify member belongs to this gym
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, gymId },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
    }

    // 5.5 Guard: Check for overlapping bookings for this member
    const overlappingBooking = await this.prisma.sessionBooking.findFirst({
      where: {
        memberId: dto.memberId,
        gymId,
        status: { in: ['BOOKED', 'CHECKED_IN'] },
        session: {
          startsAt: { lt: session.endsAt },
          endsAt: { gt: session.startsAt },
          status: { not: 'CANCELLED' },
        },
      },
    });

    if (overlappingBooking) {
      throw new BadRequestException(
        'Member is already booked for an overlapping session',
      );
    }

    // 6. Create or reactivate the booking — @@unique([sessionId, memberId]) enforces no duplicates
    const existingBooking = await this.prisma.sessionBooking.findUnique({
      where: {
        sessionId_memberId: {
          sessionId: dto.sessionId,
          memberId: dto.memberId,
        },
      },
    });

    if (existingBooking) {
      if (existingBooking.status !== 'CANCELLED') {
        throw new BadRequestException(
          'This member is already booked for this session',
        );
      }

      const updated = await this.prisma.sessionBooking.update({
        where: { id: existingBooking.id },
        data: { status: 'BOOKED' },
        select: BOOKING_SELECT,
      });
      return updated as unknown as BookingResponse;
    }

    const booking = await this.prisma.sessionBooking.create({
      data: {
        gymId,
        sessionId: dto.sessionId,
        memberId: dto.memberId,
      },
      select: BOOKING_SELECT,
    });

    return booking as unknown as BookingResponse;
  }

  /** Cancel a booking, scoped to the caller's gym */
  async cancel(id: string, gymId: string): Promise<BookingResponse> {
    const booking = await this.prisma.sessionBooking.findFirst({
      where: { id, gymId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    const updated = await this.prisma.sessionBooking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: BOOKING_SELECT,
    });

    return updated as unknown as BookingResponse;
  }

  /** Check in a booked member, scoped to the caller's gym */
  async checkIn(id: string, gymId: string): Promise<BookingResponse> {
    const booking = await this.prisma.sessionBooking.findFirst({
      where: { id, gymId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.status !== 'BOOKED') {
      throw new BadRequestException(
        `Cannot check in a ${booking.status.toLowerCase()} booking`,
      );
    }

    const updated = await this.prisma.sessionBooking.update({
      where: { id },
      data: { status: 'CHECKED_IN' },
      select: BOOKING_SELECT,
    });

    return updated as unknown as BookingResponse;
  }
}
