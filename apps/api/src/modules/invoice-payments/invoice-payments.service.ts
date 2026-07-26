import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { Role } from '@/common/enums';
import {
  InvoicePaymentListItem,
  InvoicePaymentMethod,
  InvoicePaymentResponse,
  InvoiceSummarySnapshot,
  PaginatedResponse,
  RentPaymentMethodBreakdown,
  RentPaymentSummaryResponse,
} from '@repo/contracts';
import { computeInvoiceSummary } from '@/common/invoice-summary/compute-invoice-summary';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';

type InvoicePaymentRow = {
  id: string;
  orgId: string;
  invoiceId: string;
  amount: Prisma.Decimal;
  method: string;
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** A payment row joined with everything the org-wide register displays. */
type InvoicePaymentEnrichedRow = InvoicePaymentRow & {
  invoice: {
    buildingId: string;
    leaseId: string;
    dueDate: Date;
    lineItems: { amount: Prisma.Decimal }[];
    payments: { amount: Prisma.Decimal }[];
    lease: {
      renterId: string;
      renter: { fullName: string };
      apartment: { unitNumber: string };
    };
  };
};

const ENRICHED_INCLUDE = {
  invoice: {
    select: {
      buildingId: true,
      leaseId: true,
      dueDate: true,
      lineItems: { select: { amount: true } },
      payments: { select: { amount: true } },
      lease: {
        select: {
          renterId: true,
          renter: { select: { fullName: true } },
          apartment: { select: { unitNumber: true } },
        },
      },
    },
  },
} satisfies Prisma.InvoicePaymentInclude;

/** Filters accepted by the org-wide rent-payments register. */
export type InvoicePaymentListFilters = {
  invoiceId?: string;
  buildingId?: string;
  renterId?: string;
  method?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const PAYMENT_METHODS: InvoicePaymentMethod[] = [
  'cash',
  'check',
  'bank_transfer',
  'card',
  'other',
];

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertWriteAccess(callerRole: Role): void {
    if (callerRole !== Role.ORG_ADMIN && callerRole !== Role.FINANCE) {
      throw new ForbiddenException(
        'Only an org admin or finance user can write to invoice payments.',
      );
    }
  }

  private formatPayment(payment: InvoicePaymentRow): InvoicePaymentResponse {
    return {
      id: payment.id,
      orgId: payment.orgId,
      invoiceId: payment.invoiceId,
      amount: payment.amount.toString(),
      method: payment.method as InvoicePaymentMethod,
      paidAt: payment.paidAt.toISOString(),
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  /**
   * Enriches a payment row with its renter / unit / building / parent-invoice
   * state for the org-wide register. `buildingNameById` is resolved by the
   * caller in one query — Invoice.buildingId is a bare column (no Building
   * relation in the schema), so it cannot be joined in Prisma.
   */
  private formatListItem(
    payment: InvoicePaymentEnrichedRow,
    buildingNameById: Map<string, string>,
  ): InvoicePaymentListItem {
    const { invoice } = payment;
    const { totalAmount, paidAmount, status } = computeInvoiceSummary(
      invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
      invoice.payments.map((p) => ({ amount: p.amount.toNumber() })),
      invoice.dueDate,
      new Date(),
    );

    return {
      ...this.formatPayment(payment),
      leaseId: invoice.leaseId,
      renterId: invoice.lease.renterId,
      renterName: invoice.lease.renter.fullName,
      buildingId: invoice.buildingId,
      buildingName:
        buildingNameById.get(invoice.buildingId) ?? invoice.buildingId,
      apartmentUnitNumber: invoice.lease.apartment.unitNumber,
      invoiceDueDate: invoice.dueDate.toISOString(),
      invoiceTotalAmount: totalAmount.toFixed(2),
      invoicePaidAmount: paidAmount.toFixed(2),
      invoiceStatus: status,
    };
  }

  /** Recomputes totalAmount/paidAmount/status for the parent Invoice. */
  private async summarizeInvoice(
    orgId: string,
    invoiceId: string,
  ): Promise<InvoiceSummarySnapshot> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      select: {
        dueDate: true,
        lineItems: { select: { amount: true } },
        payments: { select: { amount: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const { totalAmount, paidAmount, status } = computeInvoiceSummary(
      invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
      invoice.payments.map((p) => ({ amount: p.amount.toNumber() })),
      invoice.dueDate,
      new Date(),
    );

    return {
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      status,
    };
  }

  /** UTC start-of-month — the MTD window lower bound (mirrors ReportsService). */
  private startOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private parseDate(value: string | undefined, field: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid "${field}" date.`);
    }
    return parsed;
  }

  /**
   * Builds the shared WHERE for the register: org scope, the caller's building
   * scope (null = whole org), plus the optional user filters. The list and the
   * summary both use this so the tiles always describe exactly the rows shown.
   *
   * `opts.ignoreDateRange` drops from/to — used for the MTD tile, which keeps a
   * stable "this month" meaning regardless of the range the user picked.
   */
  private buildListWhere(
    orgId: string,
    allowedBuildingIds: string[] | null,
    filters: InvoicePaymentListFilters,
    opts: { ignoreDateRange?: boolean; paidAtFrom?: Date } = {},
  ): Prisma.InvoicePaymentWhereInput {
    const { invoiceId, buildingId, renterId, method, q } = filters;

    if (method && !PAYMENT_METHODS.includes(method as InvoicePaymentMethod)) {
      throw new BadRequestException(`Unknown payment method "${method}".`);
    }

    const from = opts.ignoreDateRange
      ? opts.paidAtFrom
      : this.parseDate(filters.from, 'from');
    const to = opts.ignoreDateRange
      ? undefined
      : this.parseDate(filters.to, 'to');
    if (from && to && from > to) {
      throw new BadRequestException('"from" must not be after "to".');
    }

    // A supervisor's allowed set intersected with an explicit building filter:
    // an out-of-scope buildingId must narrow to nothing, never widen.
    const buildingIdFilter: Prisma.StringFilter | string | undefined =
      allowedBuildingIds
        ? buildingId
          ? allowedBuildingIds.includes(buildingId)
            ? buildingId
            : { in: [] }
          : { in: allowedBuildingIds }
        : buildingId;

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      ...(buildingIdFilter !== undefined && { buildingId: buildingIdFilter }),
      ...(renterId && { lease: { renterId } }),
    };

    return {
      orgId,
      ...(invoiceId && { invoiceId }),
      ...(method && { method: method as InvoicePaymentMethod }),
      ...((from || to) && {
        paidAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
      ...(Object.keys(invoiceWhere).length > 0 && { invoice: invoiceWhere }),
      ...(q && {
        OR: [
          { notes: { contains: q, mode: 'insensitive' } },
          {
            invoice: {
              lease: {
                renter: { fullName: { contains: q, mode: 'insensitive' } },
              },
            },
          },
          {
            invoice: {
              lease: {
                apartment: { unitNumber: { contains: q, mode: 'insensitive' } },
              },
            },
          },
        ],
      }),
    };
  }

  private async buildingNamesFor(
    orgId: string,
    buildingIds: string[],
  ): Promise<Map<string, string>> {
    if (buildingIds.length === 0) return new Map();
    const buildings = await this.prisma.building.findMany({
      where: { orgId, id: { in: buildingIds } },
      select: { id: true, name: true },
    });
    return new Map(buildings.map((b) => [b.id, b.name]));
  }

  /**
   * Org-wide rent-payment register, paginated and enriched.
   *
   * Returns the `{ items, total, page, limit }` envelope (PaginatedResponse) —
   * NOT the `{ data }` envelope this method used before the register existed.
   * The invoice-detail view consumes the same endpoint with `invoiceId` set.
   */
  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
    filters: InvoicePaymentListFilters = {},
  ): Promise<PaginatedResponse<InvoicePaymentListItem>> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const page = Math.max(1, Math.trunc(filters.page ?? 1));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Math.trunc(filters.limit ?? DEFAULT_LIMIT)),
    );
    const where = this.buildListWhere(orgId, allowedBuildingIds, filters);

    const [rows, total] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        where,
        include: ENRICHED_INCLUDE,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoicePayment.count({ where }),
    ]);

    const buildingNameById = await this.buildingNamesFor(
      orgId,
      [...new Set(rows.map((r) => r.invoice.buildingId))],
    );

    return {
      items: rows.map((r) => this.formatListItem(r, buildingNameById)),
      total,
      page,
      limit,
    };
  }

  /**
   * Headline numbers for the register, over the same filters as the list.
   * `outstandingTotal` is the counterpart to what was collected: Σ of the unpaid
   * balance across invoices in scope, derived via computeInvoiceSummary so it
   * reconciles exactly with the invoice list and the reports page.
   */
  async summary(
    orgId: string,
    callerId: string,
    callerRole: Role,
    filters: InvoicePaymentListFilters = {},
    now: Date = new Date(),
  ): Promise<{ data: RentPaymentSummaryResponse }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const where = this.buildListWhere(orgId, allowedBuildingIds, filters);
    const mtdWhere = this.buildListWhere(orgId, allowedBuildingIds, filters, {
      ignoreDateRange: true,
      paidAtFrom: this.startOfMonthUtc(now),
    });

    // Invoices in the same scope, for the outstanding balance.
    const invoiceWhere: Prisma.InvoiceWhereInput = {
      orgId,
      ...(where.invoice as Prisma.InvoiceWhereInput | undefined),
    };

    const [totals, mtdTotals, byMethodRows, invoices] = await Promise.all([
      this.prisma.invoicePayment.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.invoicePayment.aggregate({
        where: mtdWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.invoicePayment.groupBy({
        by: ['method'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          dueDate: true,
          lineItems: { select: { amount: true } },
          payments: { select: { amount: true } },
        },
      }),
    ]);

    let outstandingTotal = 0;
    let outstandingInvoices = 0;
    for (const invoice of invoices) {
      const { totalAmount, paidAmount } = computeInvoiceSummary(
        invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
        invoice.payments.map((p) => ({ amount: p.amount.toNumber() })),
        invoice.dueDate,
        now,
      );
      const balance = totalAmount - paidAmount;
      if (balance > 0) {
        outstandingTotal += balance;
        outstandingInvoices += 1;
      }
    }

    const byMethod: RentPaymentMethodBreakdown[] = byMethodRows
      .map((row) => ({
        method: row.method as InvoicePaymentMethod,
        amount: (row._sum.amount?.toNumber() ?? 0).toFixed(2),
        count: row._count._all,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    return {
      data: {
        totalCollected: (totals._sum.amount?.toNumber() ?? 0).toFixed(2),
        count: totals._count._all,
        mtdCollected: (mtdTotals._sum.amount?.toNumber() ?? 0).toFixed(2),
        mtdCount: mtdTotals._count._all,
        outstandingTotal: outstandingTotal.toFixed(2),
        outstandingInvoices,
        byMethod,
      },
    };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    paymentId: string,
  ): Promise<{ data: InvoicePaymentResponse }> {
    const payment = await this.prisma.invoicePayment.findFirst({
      where: { id: paymentId, orgId },
      include: { invoice: { select: { buildingId: true } } },
    });
    if (!payment) throw new NotFoundException('Invoice payment not found.');

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      payment.invoice.buildingId,
    );

    return { data: this.formatPayment(payment) };
  }

  async create(
    orgId: string,
    actorId: string,
    callerRole: Role,
    dto: CreateInvoicePaymentDto,
  ): Promise<{
    data: { payment: InvoicePaymentResponse; invoice: InvoiceSummarySnapshot };
  }> {
    this.assertWriteAccess(callerRole);

    if (
      !dto.invoiceId ||
      dto.amount === undefined ||
      !dto.method ||
      !dto.paidAt
    ) {
      throw new BadRequestException(
        'invoiceId, amount, method, and paidAt are required.',
      );
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, orgId },
      select: {
        id: true,
        lease: { select: { renter: { select: { renterUserId: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const payment = await this.prisma.invoicePayment.create({
      data: {
        orgId,
        invoiceId: invoice.id,
        amount: dto.amount,
        method: dto.method,
        paidAt: new Date(dto.paidAt),
        notes: dto.notes,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'invoice_payment.created',
      targetType: 'InvoicePayment',
      targetId: payment.id,
      metadata: { invoiceId: invoice.id, amount: payment.amount.toString() },
    });

    // F5.1: notify the tenant a payment was recorded — skip silently if the
    // renter has no linked portal user.
    if (invoice.lease.renter.renterUserId) {
      await this.notifications.enqueue({
        orgId,
        userId: invoice.lease.renter.renterUserId,
        type: 'invoice.payment_recorded',
        title: 'Payment recorded',
        body: `A payment of ${payment.amount.toString()} was recorded on your invoice.`,
        data: { invoiceId: invoice.id, paymentId: payment.id },
      });
    }

    const summary = await this.summarizeInvoice(orgId, invoice.id);

    return { data: { payment: this.formatPayment(payment), invoice: summary } };
  }

  async remove(
    orgId: string,
    actorId: string,
    callerRole: Role,
    paymentId: string,
  ): Promise<{ data: { id: string; invoice: InvoiceSummarySnapshot } }> {
    this.assertWriteAccess(callerRole);

    const existing = await this.prisma.invoicePayment.findFirst({
      where: { id: paymentId, orgId },
    });
    if (!existing) throw new NotFoundException('Invoice payment not found.');

    await this.prisma.invoicePayment.delete({ where: { id: paymentId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'invoice_payment.deleted',
      targetType: 'InvoicePayment',
      targetId: paymentId,
      metadata: { invoiceId: existing.invoiceId },
    });

    const summary = await this.summarizeInvoice(orgId, existing.invoiceId);

    return { data: { id: paymentId, invoice: summary } };
  }
}
