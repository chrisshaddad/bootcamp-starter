import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { PlatformStatsResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

// Growth window for the "new this week" deltas.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Platform-wide aggregate counts for the super-admin dashboard KPI cards.
   *
   * Every value is a live count. `newThisWeek` counts rows created in the
   * trailing 7 days — the real week-over-week growth. Totals are intentionally
   * unscoped: the caller is restricted to SUPER_ADMIN at the controller and
   * this is a whole-platform overview (so, unlike `/users`, it includes the
   * calling admin). Medicines are a global catalog, so no tenant scope applies.
   */
  async platform(): Promise<PlatformStatsResponse> {
    const since = new Date(Date.now() - WEEK_MS);

    try {
      const [
        usersTotal,
        usersActive,
        usersPending,
        usersInactive,
        usersSuspended,
        usersNew,
        pharmaciesTotal,
        pharmaciesWithBranch,
        pharmaciesNew,
        branchesTotal,
        medicinesTotal,
        medicinesPriced,
        medicinesBarcoded,
        medicinesNew,
      ] = await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { status: 'INACTIVE' } }),
        this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.user.count({ where: { createdAt: { gte: since } } }),
        this.prisma.pharmacy.count(),
        this.prisma.pharmacy.count({ where: { branches: { some: {} } } }),
        this.prisma.pharmacy.count({ where: { createdAt: { gte: since } } }),
        this.prisma.pharmacyBranch.count(),
        this.prisma.medicine.count(),
        this.prisma.medicine.count({ where: { priceLbp: { not: null } } }),
        this.prisma.medicine.count({ where: { barcode: { not: null } } }),
        this.prisma.medicine.count({ where: { createdAt: { gte: since } } }),
      ]);

      return {
        users: {
          total: usersTotal,
          active: usersActive,
          pending: usersPending,
          inactive: usersInactive,
          suspended: usersSuspended,
          newThisWeek: usersNew,
        },
        pharmacies: {
          total: pharmaciesTotal,
          withBranch: pharmaciesWithBranch,
          newThisWeek: pharmaciesNew,
        },
        branches: {
          total: branchesTotal,
        },
        medicines: {
          total: medicinesTotal,
          priced: medicinesPriced,
          withBarcode: medicinesBarcoded,
          newThisWeek: medicinesNew,
        },
      };
    } catch (error) {
      // Surface DB failures as a NestJS exception (a clean 500) instead of
      // letting a raw Prisma error propagate.
      this.logger.error('Failed to load platform stats.', error);
      throw new InternalServerErrorException('Failed to load platform stats.');
    }
  }
}
