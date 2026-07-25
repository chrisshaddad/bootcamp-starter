import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { DashboardSummaryResponse } from '@repo/contracts';

const TREND_DAYS = 14;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Staff (ORG_ADMIN/LIBRARIAN) at-a-glance summary for their own library:
   * circulation load, catalog stock, membership mix, and revenue.
   */
  async getSummary(organizationId: string): Promise<DashboardSummaryResponse> {
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
    trendStart.setHours(0, 0, 0, 0);

    const [
      activeRentals,
      overdueRentals,
      totalBooks,
      totalCopies,
      availableCopies,
      totalMembers,
      pendingMembers,
      activeReservations,
      revenue,
      memberStatusGroups,
      recentRentals,
    ] = await Promise.all([
      this.prisma.rental.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      // Mirrors RentalsService.findAll's overdue filter: a rental flips to
      // OVERDUE status via the hourly aging sweep, but a just-missed due
      // date should count immediately too, not only after the sweep runs.
      this.prisma.rental.count({
        where: {
          organizationId,
          returnedAt: null,
          dueDate: { lt: new Date() },
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
      }),
      this.prisma.book.count({ where: { organizationId } }),
      this.prisma.bookCopy.count({ where: { organizationId } }),
      this.prisma.bookCopy.count({
        where: { organizationId, status: 'AVAILABLE' },
      }),
      this.prisma.libraryMember.count({ where: { organizationId } }),
      this.prisma.libraryMember.count({
        where: { organizationId, membershipStatus: 'PENDING' },
      }),
      this.prisma.reservation.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.purchase.aggregate({
        where: { organizationId },
        _sum: { price: true },
      }),
      this.prisma.libraryMember.groupBy({
        by: ['membershipStatus'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.rental.findMany({
        where: { organizationId, rentedAt: { gte: trendStart } },
        select: { rentedAt: true },
      }),
    ]);

    return {
      activeRentals,
      overdueRentals,
      totalBooks,
      totalCopies,
      availableCopies,
      totalMembers,
      pendingMembers,
      activeReservations,
      revenueTotal: (revenue._sum.price ?? 0).toString(),
      rentalsPerDay: bucketByDay(
        recentRentals.map((r) => r.rentedAt),
        TREND_DAYS,
      ),
      memberStatusBreakdown: memberStatusGroups.map((g) => ({
        status: g.membershipStatus,
        count: g._count,
      })),
    };
  }
}

// Buckets a list of timestamps into day-granularity counts over the last
// `days` days (oldest first), so a sparse result set still produces a
// contiguous trend line with explicit zeros rather than gaps.
export function bucketByDay(
  timestamps: Date[],
  days: number,
): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const ts of timestamps) {
    const key = new Date(ts).toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}
