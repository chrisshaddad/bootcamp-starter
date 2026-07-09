import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  RentalResponse,
  RentalListResponse,
  RentalCheckoutRequest,
  RentalReturnRequest,
  RentalLostRequest,
  RentalStatus,
} from '@repo/contracts';

const DEFAULT_LOAN_DAYS = 14;
const LATE_FEE_PER_DAY = 0.5;
const FLAT_LOST_FEE = 25;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const rentalInclude = {
  bookCopy: {
    select: {
      id: true,
      barcode: true,
      book: { select: { id: true, title: true } },
    },
  },
  member: { select: { id: true, libraryCardNumber: true } },
  staff: { select: { id: true, name: true } },
} satisfies Prisma.RentalInclude;

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List rentals for an organization, optionally filtered by member, copy, or status
   */
  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      memberId?: string;
      bookCopyId?: string;
      status?: RentalStatus;
    },
  ): Promise<RentalListResponse> {
    const { page = 1, limit = 20, memberId, bookCopyId, status } = options;
    const skip = (page - 1) * limit;
    const where = { organizationId, memberId, bookCopyId, status };

    const [rentals, total] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rentedAt: 'desc' },
        include: rentalInclude,
      }),
      this.prisma.rental.count({ where }),
    ]);

    return { rentals: rentals.map((rental) => this.toResponse(rental)), total };
  }

  /**
   * Get a single rental, scoped to the organization
   */
  async findOne(organizationId: string, id: string): Promise<RentalResponse> {
    const rental = await this.prisma.rental.findFirst({
      where: { id, organizationId },
      include: rentalInclude,
    });

    if (!rental) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    return this.toResponse(rental);
  }

  /**
   * Check out a book copy to a library member
   */
  async checkout(
    organizationId: string,
    staffId: string,
    data: RentalCheckoutRequest,
  ): Promise<RentalResponse> {
    const bookCopy = await this.prisma.bookCopy.findFirst({
      where: { id: data.bookCopyId, organizationId },
    });

    if (!bookCopy) {
      throw new BadRequestException(
        `Book copy with ID ${data.bookCopyId} not found`,
      );
    }

    if (bookCopy.status !== 'AVAILABLE') {
      throw new ConflictException(
        `Book copy is not available (status: ${bookCopy.status})`,
      );
    }

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

    const dueDate = data.dueDate ?? new Date(Date.now() + DEFAULT_LOAN_DAYS * MS_PER_DAY);

    const rentalId = await this.prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          organizationId,
          bookCopyId: data.bookCopyId,
          memberId: data.memberId,
          staffId,
          dueDate,
        },
      });

      await tx.bookCopy.update({
        where: { id: data.bookCopyId },
        data: { status: 'ON_LOAN' },
      });

      return rental.id;
    });

    return this.findOne(organizationId, rentalId);
  }

  /**
   * Return a rented book copy, computing a late fee if returned past due
   */
  async return(
    organizationId: string,
    id: string,
    data: RentalReturnRequest,
  ): Promise<RentalResponse> {
    const existing = await this.requireOpenRental(organizationId, id);

    const returnedAt = new Date();
    const lateDays = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - existing.dueDate.getTime()) / MS_PER_DAY),
    );
    const fineAmount = (lateDays * LATE_FEE_PER_DAY).toFixed(2);

    await this.prisma.$transaction(async (tx) => {
      await tx.rental.update({
        where: { id },
        data: {
          returnedAt,
          status: 'RETURNED',
          fineAmount,
          notes: data.notes ?? existing.notes,
        },
      });

      await tx.bookCopy.update({
        where: { id: existing.bookCopyId },
        data: { status: 'AVAILABLE' },
      });
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Mark a rented book copy as lost. Fine defaults to the book's sale price
   * (replacement cost), falling back to a flat fee if the book has none.
   */
  async markLost(
    organizationId: string,
    id: string,
    data: RentalLostRequest,
  ): Promise<RentalResponse> {
    const existing = await this.requireOpenRental(organizationId, id);

    const bookCopy = await this.prisma.bookCopy.findFirstOrThrow({
      where: { id: existing.bookCopyId },
      include: { book: { select: { salePrice: true } } },
    });

    const fineAmount =
      data.fineAmount ??
      bookCopy.book.salePrice?.toString() ??
      FLAT_LOST_FEE.toFixed(2);

    await this.prisma.$transaction(async (tx) => {
      await tx.rental.update({
        where: { id },
        data: {
          status: 'LOST',
          fineAmount,
          notes: data.notes ?? existing.notes,
        },
      });

      await tx.bookCopy.update({
        where: { id: existing.bookCopyId },
        data: { status: 'LOST' },
      });
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Mark a rental's outstanding fine as paid
   */
  async payFine(organizationId: string, id: string): Promise<RentalResponse> {
    const existing = await this.prisma.rental.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    if (existing.finePaid) {
      throw new ConflictException('Fine is already marked as paid');
    }

    if (Number(existing.fineAmount) <= 0) {
      throw new BadRequestException('This rental has no outstanding fine');
    }

    await this.prisma.rental.update({
      where: { id },
      data: { finePaid: true },
    });

    return this.findOne(organizationId, id);
  }

  // return()/markLost() are the only two transitions out of "currently
  // checked out" (ACTIVE or OVERDUE); reject anything already RETURNED/LOST
  // instead of letting a second return/lost silently reapply side effects
  // (double-freeing the copy, recomputing a fine that's already settled).
  private async requireOpenRental(organizationId: string, id: string) {
    const rental = await this.prisma.rental.findFirst({
      where: { id, organizationId },
    });

    if (!rental) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    if (rental.status === 'RETURNED' || rental.status === 'LOST') {
      throw new ConflictException(
        `Rental is already ${rental.status.toLowerCase()}`,
      );
    }

    return rental;
  }

  private toResponse(
    rental: Prisma.RentalGetPayload<{ include: typeof rentalInclude }>,
  ): RentalResponse {
    return {
      ...rental,
      fineAmount: rental.fineAmount.toString(),
    };
  }
}
