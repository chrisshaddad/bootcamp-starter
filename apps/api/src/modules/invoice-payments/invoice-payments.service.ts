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
import { Role } from '@/common/enums';
import {
  InvoicePaymentMethod,
  InvoicePaymentResponse,
  InvoiceSummarySnapshot,
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

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly timeline: TimelineService,
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

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
    invoiceId?: string,
  ): Promise<{ data: InvoicePaymentResponse[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const payments = await this.prisma.invoicePayment.findMany({
      where: {
        orgId,
        ...(invoiceId && { invoiceId }),
        ...(allowedBuildingIds && {
          invoice: { buildingId: { in: allowedBuildingIds } },
        }),
      },
      orderBy: { paidAt: 'desc' },
    });

    return { data: payments.map((p) => this.formatPayment(p)) };
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
      select: { id: true },
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
