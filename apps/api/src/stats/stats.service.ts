import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type {
  BranchStatsResponse,
  InquiryStatus,
  PharmacyStatsResponse,
  PlatformStatsResponse,
} from '@repo/contracts';
import { employeeRoleSchema } from '@repo/contracts';
import type { User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

// Growth window for the "new this week" deltas.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Inventory thresholds mirrored from apps/web/lib/stock.ts — keep in sync. A
// medicine whose summed batch quantity at a branch is below LOW_QUANTITY is
// "low stock"; a batch expiring within NEAR_EXPIRY_DAYS (and not yet expired)
// is "near expiry".
const LOW_QUANTITY_THRESHOLD = 15;
const NEAR_EXPIRY_DAYS = 90;

// Roles counted for the pharmacy "employees" KPI (excludes the admin themselves
// and clients) — derived from the contract enum so it can't drift.
const EMPLOYEE_ROLES = employeeRoleSchema.options;

// Inquiries still needing attention.
const OPEN_INQUIRY_STATUSES: InquiryStatus[] = ['PENDING', 'IN_PROGRESS'];

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Tenant guards: fail closed so a mis-scoped account can never fall through to
  // an unscoped aggregate.
  private pharmacyIdOf(actor: User): string {
    if (!actor.pharmacyId) {
      throw new ForbiddenException(
        'Your account is not attached to a pharmacy.',
      );
    }
    return actor.pharmacyId;
  }

  private branchIdOf(actor: User): string {
    if (!actor.branchId) {
      throw new ForbiddenException('Your account is not attached to a branch.');
    }
    return actor.branchId;
  }

  // [today 00:00 UTC, +NEAR_EXPIRY_DAYS]: the window a batch must expire within
  // to count as "near expiry". Already-expired batches fall before `gte`.
  // Expiry dates are stored as @db.Date (UTC midnight), so bound in UTC.
  private nearExpiryWindow(): { gte: Date; lte: Date } {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + NEAR_EXPIRY_DAYS);
    return { gte: start, lte: end };
  }

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

  /**
   * Pharmacy-admin dashboard aggregates (`/stats/pharmacy`), scoped to the
   * caller's pharmacy across all its branches: headline KPIs plus a per-branch
   * breakdown (staff, open inquiries, low-stock medicines, near-expiry batches).
   */
  async pharmacy(actor: User): Promise<PharmacyStatsResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);
    const nearWindow = this.nearExpiryWindow();

    try {
      const branches = await this.prisma.pharmacyBranch.findMany({
        where: { pharmacyId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, _count: { select: { users: true } } },
      });
      const branchIds = branches.map((branch) => branch.id);

      const [employees, openByBranch, stockByBranchMedicine, nearByBranch] =
        await Promise.all([
          this.prisma.user.count({
            where: { pharmacyId, role: { in: [...EMPLOYEE_ROLES] } },
          }),
          // Open inquiries per branch. Scoped by pharmacyId; an empty branch set
          // still returns nothing rather than leaking across tenants.
          this.prisma.inquiry.groupBy({
            by: ['branchId'],
            where: { pharmacyId, status: { in: OPEN_INQUIRY_STATUSES } },
            _count: { _all: true },
          }),
          // Summed quantity per (branch, medicine) — the basis for the low-stock
          // count. `branchId in []` (no branches) simply matches nothing.
          this.prisma.stockBatch.groupBy({
            by: ['branchId', 'medicineId'],
            where: { branchId: { in: branchIds } },
            _sum: { quantity: true },
          }),
          // Near-expiry batches per branch.
          this.prisma.stockBatch.groupBy({
            by: ['branchId'],
            where: { branchId: { in: branchIds }, expiryDate: nearWindow },
            _count: { _all: true },
          }),
        ]);

      const openByBranchMap = new Map(
        openByBranch.map((group) => [group.branchId, group._count._all]),
      );
      const nearByBranchMap = new Map(
        nearByBranch.map((group) => [group.branchId, group._count._all]),
      );
      // Fold the (branch, medicine) sums into a low-stock medicine count per
      // branch — one increment for each medicine below the threshold.
      const lowByBranchMap = new Map<string, number>();
      for (const group of stockByBranchMedicine) {
        if ((group._sum.quantity ?? 0) < LOW_QUANTITY_THRESHOLD) {
          lowByBranchMap.set(
            group.branchId,
            (lowByBranchMap.get(group.branchId) ?? 0) + 1,
          );
        }
      }

      const perBranch = branches.map((branch) => ({
        branchId: branch.id,
        name: branch.name,
        staff: branch._count.users,
        openInquiries: openByBranchMap.get(branch.id) ?? 0,
        lowStock: lowByBranchMap.get(branch.id) ?? 0,
        nearExpiry: nearByBranchMap.get(branch.id) ?? 0,
      }));

      return {
        branches: branches.length,
        employees,
        openInquiries: perBranch.reduce((sum, b) => sum + b.openInquiries, 0),
        lowStock: perBranch.reduce((sum, b) => sum + b.lowStock, 0),
        perBranch,
      };
    } catch (error) {
      this.logger.error('Failed to load pharmacy stats.', error);
      throw new InternalServerErrorException('Failed to load pharmacy stats.');
    }
  }

  /**
   * Branch dashboard aggregates (`/stats/branch`), scoped to the caller's own
   * branch: low-stock and near-expiry alerts, the open-inquiry count, and a
   * short recent-activity feed by this branch's staff.
   */
  async branch(actor: User): Promise<BranchStatsResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);
    const branchId = this.branchIdOf(actor);
    const nearWindow = this.nearExpiryWindow();

    try {
      const [stockByMedicine, nearExpiry, openInquiries, recentActivity] =
        await Promise.all([
          this.prisma.stockBatch.groupBy({
            by: ['medicineId'],
            where: { branchId },
            _sum: { quantity: true },
          }),
          this.prisma.stockBatch.count({
            where: { branchId, expiryDate: nearWindow },
          }),
          this.prisma.inquiry.count({
            where: {
              pharmacyId,
              branchId,
              status: { in: OPEN_INQUIRY_STATUSES },
            },
          }),
          this.audit.recentForBranch(branchId),
        ]);

      const lowStock = stockByMedicine.filter(
        (group) => (group._sum.quantity ?? 0) < LOW_QUANTITY_THRESHOLD,
      ).length;

      return { lowStock, nearExpiry, openInquiries, recentActivity };
    } catch (error) {
      this.logger.error('Failed to load branch stats.', error);
      throw new InternalServerErrorException('Failed to load branch stats.');
    }
  }
}
