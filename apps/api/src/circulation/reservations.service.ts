import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  ReservationResponse,
  ReservationListResponse,
  ReservationCreateRequest,
  ReservationReadyRequest,
  ReservationFulfillRequest,
  ReservationStatus,
} from '@repo/contracts';
import { DEFAULT_LOAN_DAYS, MS_PER_DAY } from './rentals.service';

const PICKUP_WINDOW_DAYS = 3;

const reservationInclude = {
  book: { select: { id: true, title: true } },
  member: { select: { id: true, libraryCardNumber: true } },
} satisfies Prisma.ReservationInclude;

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List reservations for an organization, optionally filtered by member, book, or status
   */
  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      memberId?: string;
      bookId?: string;
      status?: ReservationStatus;
    },
  ): Promise<ReservationListResponse> {
    const { page = 1, limit = 20, memberId, bookId, status } = options;
    const skip = (page - 1) * limit;
    const where = { organizationId, memberId, bookId, status };

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reservedAt: 'desc' },
        include: reservationInclude,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return { reservations, total };
  }

  /**
   * Get a single reservation, scoped to the organization
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<ReservationResponse> {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
      include: reservationInclude,
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  /**
   * Place a hold on a book for a library member
   */
  async create(
    organizationId: string,
    data: ReservationCreateRequest,
  ): Promise<ReservationResponse> {
    const book = await this.prisma.book.findFirst({
      where: { id: data.bookId, organizationId },
    });

    if (!book) {
      throw new BadRequestException(`Book with ID ${data.bookId} not found`);
    }

    await this.assertBookHasCopies(organizationId, data.bookId);

    const member = await this.prisma.libraryMember.findFirst({
      where: { id: data.memberId, organizationId },
    });

    if (!member) {
      throw new BadRequestException(
        `Library member with ID ${data.memberId} not found`,
      );
    }

    if (member.membershipStatus !== 'ACTIVE') {
      throw new BadRequestException(
        `Library member's membership is not active (status: ${member.membershipStatus})`,
      );
    }

    return this.prisma.reservation.create({
      data: {
        organizationId,
        bookId: data.bookId,
        memberId: data.memberId,
        expiresAt: data.expiresAt,
        preferredCondition: data.preferredCondition,
      },
      include: reservationInclude,
    });
  }

  /**
   * Set aside a specific available copy for a hold, notifying the member
   */
  async markReady(
    organizationId: string,
    id: string,
    data: ReservationReadyRequest,
  ): Promise<ReservationResponse> {
    const existing = await this.requireStatus(organizationId, id, 'ACTIVE');

    const bookCopy = await this.prisma.bookCopy.findFirst({
      where: { id: data.bookCopyId, organizationId, bookId: existing.bookId },
    });

    if (!bookCopy) {
      throw new BadRequestException(
        `Book copy with ID ${data.bookCopyId} not found for this book`,
      );
    }

    if (bookCopy.status !== 'AVAILABLE') {
      throw new ConflictException(
        `Book copy is not available (status: ${bookCopy.status})`,
      );
    }

    // Staff still explicitly pick the copy - this only validates their pick
    // against the patron's preference, it never auto-selects a copy for them.
    if (
      existing.preferredCondition &&
      bookCopy.condition !== existing.preferredCondition
    ) {
      throw new ConflictException(
        `This copy is ${bookCopy.condition.toLowerCase()}, but the patron requested ${existing.preferredCondition.toLowerCase()} condition`,
      );
    }

    const notifiedAt = new Date();
    const expiresAt =
      existing.expiresAt ??
      new Date(notifiedAt.getTime() + PICKUP_WINDOW_DAYS * MS_PER_DAY);

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: { status: 'READY_FOR_PICKUP', notifiedAt, expiresAt },
      });

      await tx.bookCopy.update({
        where: { id: bookCopy.id },
        data: { status: 'RESERVED' },
      });
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Convert a ready hold into a rental once the member picks up the copy
   */
  async fulfill(
    organizationId: string,
    id: string,
    staffId: string,
    data: ReservationFulfillRequest,
  ): Promise<ReservationResponse> {
    const existing = await this.requireStatus(
      organizationId,
      id,
      'READY_FOR_PICKUP',
    );

    const bookCopy = await this.findReservedCopy(
      organizationId,
      existing.bookId,
    );
    const dueDate =
      data.dueDate ?? new Date(Date.now() + DEFAULT_LOAN_DAYS * MS_PER_DAY);

    await this.prisma.$transaction(async (tx) => {
      await tx.rental.create({
        data: {
          organizationId,
          bookCopyId: bookCopy.id,
          memberId: existing.memberId,
          staffId,
          dueDate,
        },
      });

      await tx.bookCopy.update({
        where: { id: bookCopy.id },
        data: { status: 'ON_LOAN' },
      });

      await tx.reservation.update({
        where: { id },
        data: { status: 'FULFILLED', fulfilledAt: new Date() },
      });
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Cancel a hold, releasing its set-aside copy back to AVAILABLE if one was assigned
   */
  async cancel(
    organizationId: string,
    id: string,
  ): Promise<ReservationResponse> {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (
      existing.status === 'FULFILLED' ||
      existing.status === 'CANCELLED' ||
      existing.status === 'EXPIRED'
    ) {
      throw new ConflictException(
        `Reservation is already ${existing.status.toLowerCase()}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.status === 'READY_FOR_PICKUP') {
        const bookCopy = await this.findReservedCopy(
          organizationId,
          existing.bookId,
          tx,
        );

        await tx.bookCopy.update({
          where: { id: bookCopy.id },
          data: { status: 'AVAILABLE' },
        });
      }

      await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Daily housekeeping (see DueReminderScanProcessor - shares the same
   * nightly circulation-scan trigger as rental due reminders): a hold that's
   * been READY_FOR_PICKUP past its expiresAt without being picked up is
   * expired, releasing its set-aside copy back to AVAILABLE for the next
   * patron. Platform-wide, not organizationId-scoped, matching
   * DueRemindersService.runDailyScan()'s same one-cron-for-everyone shape.
   */
  async expireStalePickups(): Promise<number> {
    const stale = await this.prisma.reservation.findMany({
      where: { status: 'READY_FOR_PICKUP', expiresAt: { lt: new Date() } },
    });

    for (const reservation of stale) {
      await this.prisma.$transaction(async (tx) => {
        const bookCopy = await tx.bookCopy.findFirst({
          where: {
            bookId: reservation.bookId,
            organizationId: reservation.organizationId,
            status: 'RESERVED',
          },
        });

        if (bookCopy) {
          await tx.bookCopy.update({
            where: { id: bookCopy.id },
            data: { status: 'AVAILABLE' },
          });
        }

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'EXPIRED' },
        });
      });
    }

    return stale.length;
  }

  // A hold is a bet on future availability, so this only checks the book has
  // ever had copies at all (not that one is free right now) - unlike
  // markReady() which is a *now* action and validates against the actual
  // copy staff pick.
  private async assertBookHasCopies(
    organizationId: string,
    bookId: string,
  ): Promise<void> {
    const count = await this.prisma.bookCopy.count({
      where: { organizationId, bookId },
    });

    if (count === 0) {
      throw new BadRequestException(
        'This book has no copies in this library yet',
      );
    }
  }

  private async requireStatus(
    organizationId: string,
    id: string,
    expected: ReservationStatus,
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, organizationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    if (reservation.status !== expected) {
      throw new ConflictException(
        `Reservation is ${reservation.status.toLowerCase()}, expected ${expected.toLowerCase()}`,
      );
    }

    return reservation;
  }

  // Reservation has no bookCopyId column, so the copy set aside in
  // markReady() is inferred from BookCopy.status = RESERVED for this book
  // rather than a direct FK (deliberate scope decision - see the commit
  // message). This is ambiguous if the same book ever has two copies
  // RESERVED at once for two different holds; acceptable at this dataset's
  // scale, but a real correctness gap under concurrent holds on one title.
  private async findReservedCopy(
    organizationId: string,
    bookId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const bookCopy = await tx.bookCopy.findFirst({
      where: { bookId, organizationId, status: 'RESERVED' },
    });

    if (!bookCopy) {
      throw new ConflictException(
        'No reserved copy found for this book - it may have been reassigned',
      );
    }

    return bookCopy;
  }
}
