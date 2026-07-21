import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { LeaseStatus, RecurringInvoiceRunResponse } from '@repo/contracts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Generate 7 days before the computed due date (decision D1). */
const LEAD_WINDOW_DAYS = 7;

export type GenerateResult =
  'created' | 'skipped-existing' | 'not-due' | 'inactive';

/**
 * The minimal lease shape {@link RecurringInvoicesService.generateForLease}
 * needs. Deliberately DB-shape-agnostic (plain fields, no Prisma payload
 * types) so unit tests can hand-build fixtures without a real Lease row.
 */
export type RecurringLeaseInput = {
  id: string;
  orgId: string;
  buildingId: string;
  startDate: Date;
  endDate: Date;
  /** Raw DB status ('draft' | 'active' | 'terminated' — 'expired' is derived, never stored). */
  status: string;
  rentAmount: Prisma.Decimal | number;
  /** Keycloak sub of the tenant to notify when an invoice is auto-generated (F5.1); null if the renter has no linked portal user. */
  renterUserId: string | null;
};

/**
 * F3.1 recurring rent invoices (decision D1): monthly, anchored to the
 * lease's start-date day-of-month, generated 7 days before the computed due
 * date, idempotent per (lease, billing period) via the Invoice
 * `@@unique([leaseId, billingPeriod])` constraint. No proration — the line
 * item is always the flat `lease.rentAmount`.
 */
@Injectable()
export class RecurringInvoicesService {
  private readonly logger = new Logger(RecurringInvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
    private readonly leaseStatus: LeaseStatusService,
  ) {}

  /** UTC midnight for `date` — every comparison below is done at day granularity. */
  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  /**
   * `anchorDay` clamped into (year, month) — e.g. anchor 31 in a 28-day
   * February becomes Feb 28. `month` may be any integer (including < 0 or
   * > 11); `Date.UTC` normalizes the overflow/underflow into the correct
   * year, which is what lets `nextDueDate` roll into next month for free.
   */
  private clampedDateForMonth(
    year: number,
    month: number,
    anchorDay: number,
  ): Date {
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(anchorDay, lastDayOfMonth)));
  }

  /**
   * The next occurrence of `anchorDay` on/after `today` (both already
   * UTC-midnight-normalized): this month's occurrence (clamped for short
   * months), or next month's if this month's has already passed.
   */
  private nextDueDate(anchorDay: number, today: Date): Date {
    const thisMonth = this.clampedDateForMonth(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      anchorDay,
    );
    if (thisMonth < today) {
      return this.clampedDateForMonth(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        anchorDay,
      );
    }
    return thisMonth;
  }

  private billingPeriodKey(date: Date): string {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}`;
  }

  /**
   * Pure, idempotent core: given a lease and an "as of" date, decide whether
   * a rent invoice is due and — if so — create it. Safe to call repeatedly
   * for the same (lease, asOf): a second call in the same billing period is
   * a no-op ('skipped-existing'), backstopped by the DB unique constraint
   * even under a concurrent-writer race.
   */
  async generateForLease(
    lease: RecurringLeaseInput,
    asOf: Date,
  ): Promise<GenerateResult> {
    const today = this.startOfUtcDay(asOf);
    const anchorDay = lease.startDate.getUTCDate();
    const candidate = this.nextDueDate(anchorDay, today);

    const leadDays = Math.round(
      (candidate.getTime() - today.getTime()) / MS_PER_DAY,
    );
    if (leadDays > LEAD_WINDOW_DAYS) {
      return 'not-due';
    }

    const isActive = this.leaseStatus.isEffectivelyActive(
      { status: lease.status as LeaseStatus, endDate: lease.endDate },
      candidate,
    );
    if (candidate < this.startOfUtcDay(lease.startDate) || !isActive) {
      return 'inactive';
    }

    const billingPeriod = this.billingPeriodKey(candidate);

    const existing = await this.prisma.invoice.findUnique({
      where: { leaseId_billingPeriod: { leaseId: lease.id, billingPeriod } },
    });
    if (existing) {
      return 'skipped-existing';
    }

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          orgId: lease.orgId,
          buildingId: lease.buildingId,
          leaseId: lease.id,
          dueDate: candidate,
          billingPeriod,
          lineItems: {
            create: [
              {
                category: 'rent',
                description: 'Monthly rent',
                amount: lease.rentAmount,
              },
            ],
          },
        },
      });

      await this.timeline.emit({
        orgId: lease.orgId,
        action: 'invoice.auto_generated',
        targetType: 'Invoice',
        targetId: invoice.id,
        metadata: { leaseId: lease.id, billingPeriod },
      });

      // F5.1: notify the tenant — system-generated, no actor. Skip silently
      // when the renter has no linked portal user.
      if (lease.renterUserId) {
        await this.notifications.enqueue({
          orgId: lease.orgId,
          userId: lease.renterUserId,
          type: 'invoice.issued',
          title: 'New invoice issued',
          body: `Your rent invoice for ${billingPeriod} has been issued, due ${candidate.toISOString().slice(0, 10)}.`,
          data: { invoiceId: invoice.id, leaseId: lease.id, billingPeriod },
        });
      }

      return 'created';
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Idempotency backstop: another writer created the same
        // (leaseId, billingPeriod) invoice in the race window between our
        // existence check and this create.
        return 'skipped-existing';
      }
      throw err;
    }
  }

  /** Run generation for every active lease in one org. */
  async runForOrg(
    orgId: string,
    asOf: Date = new Date(),
  ): Promise<RecurringInvoiceRunResponse> {
    const rawLeases = await this.prisma.lease.findMany({
      where: { orgId, status: 'active' },
      select: {
        id: true,
        orgId: true,
        buildingId: true,
        startDate: true,
        endDate: true,
        status: true,
        rentAmount: true,
        renter: { select: { renterUserId: true } },
      },
    });

    // Flatten Renter.renterUserId onto the lease — RecurringLeaseInput stays
    // DB-shape-agnostic (see its doc comment) so generateForLease's unit
    // tests can keep hand-building plain fixtures.
    const leases: RecurringLeaseInput[] = rawLeases.map((l) => ({
      id: l.id,
      orgId: l.orgId,
      buildingId: l.buildingId,
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
      rentAmount: l.rentAmount,
      renterUserId: l.renter?.renterUserId ?? null,
    }));

    let generated = 0;
    let skippedExisting = 0;
    for (const lease of leases) {
      const result = await this.generateForLease(lease, asOf);
      if (result === 'created') generated++;
      else if (result === 'skipped-existing') skippedExisting++;
    }

    return { generated, leasesConsidered: leases.length, skippedExisting };
  }

  /**
   * Run generation across every org — the daily scheduler's entry point.
   * Iterates orgs (derived from the set of orgs with an active lease) and
   * aggregates each org's {@link runForOrg} result.
   */
  async runAll(asOf: Date = new Date()): Promise<RecurringInvoiceRunResponse> {
    const orgs = await this.prisma.lease.findMany({
      where: { status: 'active' },
      select: { orgId: true },
      distinct: ['orgId'],
    });

    const totals: RecurringInvoiceRunResponse = {
      generated: 0,
      leasesConsidered: 0,
      skippedExisting: 0,
    };
    for (const { orgId } of orgs) {
      const result = await this.runForOrg(orgId, asOf);
      totals.generated += result.generated;
      totals.leasesConsidered += result.leasesConsidered;
      totals.skippedExisting += result.skippedExisting;
    }

    this.logger.log(
      `Recurring invoice run: generated=${totals.generated} considered=${totals.leasesConsidered} skipped=${totals.skippedExisting}`,
    );

    return totals;
  }
}
