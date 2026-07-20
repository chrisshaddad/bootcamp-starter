import { BadRequestException, Injectable } from '@nestjs/common';
import { ApartmentStatus, LeaseStatus } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { computeInvoiceSummary } from '@/common/invoice-summary/compute-invoice-summary';
import type {
  OverdueInvoiceRow,
  RentRollRow,
  ReportRange,
  ReportSummary,
} from '@repo/contracts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DecimalLike = { toNumber(): number } | null | undefined;

/**
 * Read-only reporting aggregates. Every method is scoped by `orgId` only:
 * the controller restricts these endpoints to org-wide roles (org_admin,
 * finance), so — unlike the Invoices module — no per-building narrowing is
 * needed here. Monetary values are derived through {@link computeInvoiceSummary}
 * (the same helper the Invoices module uses) so the numbers reconcile exactly,
 * and are serialized as fixed(2) strings to match the rest of the contract.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private toNum(value: DecimalLike): number {
    return value ? value.toNumber() : 0;
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  /** UTC start-of-month for `now` (MTD window lower bound). */
  private startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /** UTC start-of-year for `now` (YTD window lower bound). */
  private startOfYearUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  }

  private parseRequiredDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid "${field}" date.`);
    }
    return parsed;
  }

  private async sumInvoicePayments(
    orgId: string,
    gte: Date,
    lte: Date,
  ): Promise<number> {
    const { _sum } = await this.prisma.invoicePayment.aggregate({
      _sum: { amount: true },
      where: { orgId, paidAt: { gte, lte } },
    });
    return this.toNum(_sum.amount);
  }

  private async sumExpenses(
    orgId: string,
    gte: Date,
    lte: Date,
  ): Promise<number> {
    const { _sum } = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: { orgId, incurredAt: { gte, lte } },
    });
    return this.toNum(_sum.amount);
  }

  async getSummary(
    orgId: string,
    opts: { from?: string; to?: string } = {},
    now: Date = new Date(),
  ): Promise<{ data: ReportSummary }> {
    const { from, to } = opts;
    if ((from && !to) || (to && !from)) {
      throw new BadRequestException(
        'Provide both "from" and "to", or neither.',
      );
    }

    const monthStart = this.startOfMonthUtc(now);
    const yearStart = this.startOfYearUtc(now);

    const [
      activeLeases,
      totalApartments,
      occupiedApartments,
      mtdIncome,
      ytdIncome,
      mtdExpenses,
      ytdExpenses,
    ] = await Promise.all([
      this.prisma.lease.count({
        where: { orgId, status: LeaseStatus.active, endDate: { gte: now } },
      }),
      this.prisma.apartment.count({ where: { orgId } }),
      this.prisma.apartment.count({
        where: { orgId, status: ApartmentStatus.occupied },
      }),
      this.sumInvoicePayments(orgId, monthStart, now),
      this.sumInvoicePayments(orgId, yearStart, now),
      this.sumExpenses(orgId, monthStart, now),
      this.sumExpenses(orgId, yearStart, now),
    ]);

    const occupancyPct =
      totalApartments > 0
        ? Math.round((occupiedApartments / totalApartments) * 1000) / 10
        : 0;

    let range: ReportRange | null = null;
    if (from && to) {
      const gte = this.parseRequiredDate(from, 'from');
      const lte = this.parseRequiredDate(to, 'to');
      const [income, expenses] = await Promise.all([
        this.sumInvoicePayments(orgId, gte, lte),
        this.sumExpenses(orgId, gte, lte),
      ]);
      range = {
        from: gte.toISOString(),
        to: lte.toISOString(),
        income: this.money(income),
        expenses: this.money(expenses),
        net: this.money(income - expenses),
      };
    }

    return {
      data: {
        activeLeases,
        totalApartments,
        occupiedApartments,
        occupancyPct,
        mtdIncome: this.money(mtdIncome),
        ytdIncome: this.money(ytdIncome),
        mtdExpenses: this.money(mtdExpenses),
        ytdExpenses: this.money(ytdExpenses),
        mtdNet: this.money(mtdIncome - mtdExpenses),
        ytdNet: this.money(ytdIncome - ytdExpenses),
        range,
      },
    };
  }

  async getRentRoll(
    orgId: string,
    now: Date = new Date(),
  ): Promise<{ data: RentRollRow[] }> {
    const leases = await this.prisma.lease.findMany({
      where: { orgId, status: LeaseStatus.active, endDate: { gte: now } },
      include: {
        renter: { select: { fullName: true } },
        apartment: { select: { unitNumber: true } },
        invoices: {
          select: {
            lineItems: { select: { amount: true } },
            payments: { select: { amount: true } },
          },
        },
      },
      orderBy: { apartment: { unitNumber: 'asc' } },
    });

    const rows = leases.map((lease) => {
      const lineItems = lease.invoices.flatMap((inv) =>
        inv.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
      );
      const payments = lease.invoices.flatMap((inv) =>
        inv.payments.map((p) => ({ amount: p.amount.toNumber() })),
      );
      // dueDate/now feed only the derived status, which the rent roll ignores —
      // pass `now` for both. totalAmount/paidAmount are all we consume here.
      const { totalAmount, paidAmount } = computeInvoiceSummary(
        lineItems,
        payments,
        now,
        now,
      );
      return {
        leaseId: lease.id,
        unitNumber: lease.apartment.unitNumber,
        renterName: lease.renter.fullName,
        rent: this.money(lease.rentAmount.toNumber()),
        invoiced: this.money(totalAmount),
        paid: this.money(paidAmount),
        balance: this.money(totalAmount - paidAmount),
      };
    });

    return { data: rows };
  }

  async getOverdue(
    orgId: string,
    asOf?: string,
    now: Date = new Date(),
  ): Promise<{ data: OverdueInvoiceRow[] }> {
    const asOfDate = asOf ? this.parseRequiredDate(asOf, 'asOf') : now;

    const invoices = await this.prisma.invoice.findMany({
      where: { orgId, dueDate: { lt: asOfDate } },
      include: {
        lineItems: { select: { amount: true } },
        payments: { select: { amount: true } },
        lease: {
          select: {
            renter: { select: { fullName: true } },
            apartment: { select: { unitNumber: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const rows: OverdueInvoiceRow[] = [];
    for (const invoice of invoices) {
      const { totalAmount, paidAmount, status } = computeInvoiceSummary(
        invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
        invoice.payments.map((p) => ({ amount: p.amount.toNumber() })),
        invoice.dueDate,
        asOfDate,
      );
      // status === 'overdue' ⟺ past due AND not fully paid (outstanding balance).
      if (status !== 'overdue') continue;

      const daysOverdue = Math.max(
        0,
        Math.floor(
          (asOfDate.getTime() - invoice.dueDate.getTime()) / MS_PER_DAY,
        ),
      );
      rows.push({
        invoiceId: invoice.id,
        unitNumber: invoice.lease.apartment.unitNumber,
        renterName: invoice.lease.renter.fullName,
        dueDate: invoice.dueDate.toISOString(),
        invoiced: this.money(totalAmount),
        paid: this.money(paidAmount),
        balance: this.money(totalAmount - paidAmount),
        daysOverdue,
      });
    }

    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return { data: rows };
  }
}
