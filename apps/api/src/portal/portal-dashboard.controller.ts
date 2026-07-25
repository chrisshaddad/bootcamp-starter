import { BadRequestException, Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LibraryMembersService } from '../library-members/library-members.service';
import { Roles, CurrentUser, ActiveOrganizationId } from '../auth/decorators';
import type { User } from '@repo/db';
import type { PortalDashboardSummaryResponse } from '@repo/contracts';

const UPCOMING_DUE_LIMIT = 3;

@Controller('portal/dashboard')
@Roles('MEMBER')
export class PortalDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libraryMembersService: LibraryMembersService,
  ) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
  ): Promise<PortalDashboardSummaryResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
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
        where: { organizationId, memberId: member.id, status: 'ACTIVE' },
      }),
      this.prisma.rental.count({
        where: {
          organizationId,
          memberId: member.id,
          returnedAt: null,
          dueDate: { lt: new Date() },
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
      }),
      this.prisma.rental.findMany({
        where: {
          organizationId,
          memberId: member.id,
          finePaid: false,
          fineAmount: { gt: 0 },
        },
        select: { fineAmount: true },
      }),
      this.prisma.reservation.count({
        where: { organizationId, memberId: member.id, status: 'ACTIVE' },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId,
          memberId: member.id,
          status: 'READY_FOR_PICKUP',
        },
      }),
      this.prisma.purchase.count({
        where: { organizationId, memberId: member.id },
      }),
      this.prisma.rental.findMany({
        where: {
          organizationId,
          memberId: member.id,
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
        take: UPCOMING_DUE_LIMIT,
        select: {
          dueDate: true,
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
      })),
    };
  }

  // Every portal controller resolves org from @ActiveOrganizationId(), not
  // @CurrentUser().organizationId (which is null for MEMBER). A patron who
  // hasn't activated a library yet gets a clear 400, not an unscoped query.
  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }
}
