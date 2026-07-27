import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type { PortalDashboardSummaryResponse } from '@repo/contracts';

const UPCOMING_DUE_LIMIT = 5;

@Controller('portal/dashboard')
@Roles('MEMBER')
export class PortalDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: User,
  ): Promise<PortalDashboardSummaryResponse> {
    // Account-wide, not scoped to the session's active library - a patron
    // holding cards at multiple libraries should see everything here, same
    // as "My Rentals"/"My Reservations" aren't library-filtered either.
    const memberships = await this.prisma.libraryMember.findMany({
      where: { userId: user.id },
      select: { id: true, organization: { select: { name: true } } },
    });
    const memberIds = memberships.map((m) => m.id);
    const libraryNameByMemberId = new Map(
      memberships.map((m) => [m.id, m.organization.name]),
    );

    const [
      activeRentals,
      overdueRentals,
      unpaidFines,
      activeReservations,
      readyForPickup,
      totalPurchases,
      upcoming,
    ] = await Promise.all([
      this.prisma.rental.count({
        where: { memberId: { in: memberIds }, status: 'ACTIVE' },
      }),
      this.prisma.rental.count({
        where: {
          memberId: { in: memberIds },
          returnedAt: null,
          dueDate: { lt: new Date() },
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
      }),
      this.prisma.rental.findMany({
        where: {
          memberId: { in: memberIds },
          finePaid: false,
          fineAmount: { gt: 0 },
        },
        select: { fineAmount: true },
      }),
      this.prisma.reservation.count({
        where: { memberId: { in: memberIds }, status: 'ACTIVE' },
      }),
      this.prisma.reservation.count({
        where: { memberId: { in: memberIds }, status: 'READY_FOR_PICKUP' },
      }),
      this.prisma.purchase.count({
        where: { memberId: { in: memberIds } },
      }),
      this.prisma.rental.findMany({
        where: {
          memberId: { in: memberIds },
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
        take: UPCOMING_DUE_LIMIT,
        select: {
          dueDate: true,
          memberId: true,
          bookCopy: { select: { book: { select: { title: true } } } },
        },
      }),
    ]);

    const totalFinesOwed = unpaidFines
      .reduce((sum, r) => sum + Number(r.fineAmount), 0)
      .toFixed(2);

    return {
      activeRentals,
      overdueRentals,
      totalFinesOwed,
      activeReservations,
      readyForPickup,
      totalPurchases,
      upcomingDue: upcoming.map((r) => ({
        bookTitle: r.bookCopy.book.title,
        dueDate: r.dueDate,
        libraryName: libraryNameByMemberId.get(r.memberId) ?? 'Unknown library',
      })),
    };
  }
}
