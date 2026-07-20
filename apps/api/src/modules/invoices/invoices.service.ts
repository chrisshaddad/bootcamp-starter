import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { Role } from '@/common/enums';
import { InvoiceLineItemCategory, InvoiceResponse } from '@repo/contracts';
import { computeInvoiceSummary } from '@/common/invoice-summary/compute-invoice-summary';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

type InvoiceRow = {
  id: string;
  orgId: string;
  buildingId: string;
  leaseId: string;
  dueDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: {
    id: string;
    invoiceId: string;
    category: string;
    description: string | null;
    amount: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }[];
  payments: { amount: Prisma.Decimal }[];
  lease: {
    renterId: string;
    renter: { fullName: string };
    apartment: { unitNumber: string };
  };
};

const INVOICE_INCLUDE = {
  lineItems: true,
  payments: { select: { amount: true } },
  lease: {
    include: {
      renter: { select: { fullName: true } },
      apartment: { select: { unitNumber: true } },
    },
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly timeline: TimelineService,
  ) {}

  private assertWriteAccess(callerRole: Role): void {
    if (callerRole !== Role.ORG_ADMIN && callerRole !== Role.FINANCE) {
      throw new ForbiddenException(
        'Only an org admin or finance user can write to invoices.',
      );
    }
  }

  private formatInvoice(invoice: InvoiceRow): InvoiceResponse {
    const { totalAmount, paidAmount, status } = computeInvoiceSummary(
      invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
      invoice.payments.map((p) => ({ amount: p.amount.toNumber() })),
      invoice.dueDate,
      new Date(),
    );

    return {
      id: invoice.id,
      orgId: invoice.orgId,
      buildingId: invoice.buildingId,
      leaseId: invoice.leaseId,
      dueDate: invoice.dueDate.toISOString(),
      notes: invoice.notes,
      lineItems: invoice.lineItems.map((li) => ({
        id: li.id,
        invoiceId: li.invoiceId,
        category: li.category as InvoiceLineItemCategory,
        description: li.description,
        amount: li.amount.toString(),
        createdAt: li.createdAt.toISOString(),
        updatedAt: li.updatedAt.toISOString(),
      })),
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      status,
      renterId: invoice.lease.renterId,
      renterName: invoice.lease.renter.fullName,
      apartmentUnitNumber: invoice.lease.apartment.unitNumber,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: InvoiceResponse[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const invoices = await this.prisma.invoice.findMany({
      where: {
        orgId,
        ...(allowedBuildingIds && { buildingId: { in: allowedBuildingIds } }),
      },
      include: INVOICE_INCLUDE,
      orderBy: { dueDate: 'desc' },
    });

    return { data: invoices.map((i) => this.formatInvoice(i)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    invoiceId: string,
  ): Promise<{ data: InvoiceResponse }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      invoice.buildingId,
    );

    return { data: this.formatInvoice(invoice) };
  }

  // ── CRUD (write) ──────────────────────────────────────────────────────────

  private validateLineItems(
    lineItems: { category?: string; amount?: number }[] | undefined,
  ): void {
    if (!lineItems || lineItems.length === 0) {
      throw new BadRequestException('At least one line item is required.');
    }
    for (const li of lineItems) {
      if (!li.category || li.amount === undefined || li.amount === null) {
        throw new BadRequestException(
          'Each line item requires a category and an amount.',
        );
      }
    }
  }

  async create(
    orgId: string,
    actorId: string,
    callerRole: Role,
    dto: CreateInvoiceDto,
  ): Promise<{ data: InvoiceResponse }> {
    this.assertWriteAccess(callerRole);

    if (!dto.leaseId || !dto.dueDate) {
      throw new BadRequestException('leaseId and dueDate are required.');
    }
    this.validateLineItems(dto.lineItems);

    const lease = await this.prisma.lease.findFirst({
      where: { id: dto.leaseId, orgId },
      select: { id: true, buildingId: true },
    });
    if (!lease) throw new NotFoundException('Lease not found.');

    const invoice = await this.prisma.invoice.create({
      data: {
        orgId,
        buildingId: lease.buildingId,
        leaseId: lease.id,
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        lineItems: {
          create: dto.lineItems.map((li) => ({
            category: li.category,
            description: li.description,
            amount: li.amount,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'invoice.created',
      targetType: 'Invoice',
      targetId: invoice.id,
      metadata: {
        leaseId: invoice.leaseId,
        lineItemCount: dto.lineItems.length,
      },
    });

    return { data: this.formatInvoice(invoice) };
  }

  async update(
    orgId: string,
    actorId: string,
    callerRole: Role,
    invoiceId: string,
    dto: UpdateInvoiceDto,
  ): Promise<{ data: InvoiceResponse }> {
    this.assertWriteAccess(callerRole);

    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
    });
    if (!existing) throw new NotFoundException('Invoice not found.');

    if (dto.lineItems !== undefined) {
      this.validateLineItems(dto.lineItems);
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      if (dto.lineItems !== undefined) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.lineItems !== undefined && {
            lineItems: {
              create: dto.lineItems.map((li) => ({
                category: li.category,
                description: li.description,
                amount: li.amount,
              })),
            },
          }),
        },
        include: INVOICE_INCLUDE,
      });
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'invoice.updated',
      targetType: 'Invoice',
      targetId: invoiceId,
      metadata: { changes: Object.keys(dto) },
    });

    return { data: this.formatInvoice(invoice) };
  }

  async remove(
    orgId: string,
    actorId: string,
    callerRole: Role,
    invoiceId: string,
  ): Promise<{ data: { id: string } }> {
    this.assertWriteAccess(callerRole);

    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
    });
    if (!existing) throw new NotFoundException('Invoice not found.');

    const paymentCount = await this.prisma.invoicePayment.count({
      where: { invoiceId },
    });
    if (paymentCount > 0) {
      throw new ConflictException(
        'Cannot delete an invoice that has recorded payments.',
      );
    }

    await this.prisma.invoice.delete({ where: { id: invoiceId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'invoice.deleted',
      targetType: 'Invoice',
      targetId: invoiceId,
      metadata: { leaseId: existing.leaseId },
    });

    return { data: { id: invoiceId } };
  }
}
