import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { Role } from '@/common/enums';
import { InvoiceLineItemCategory, InvoiceResponse } from '@repo/contracts';
import { computeInvoiceSummary } from '@/common/invoice-summary/compute-invoice-summary';

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
  lease: {
    renter: { fullName: string };
    apartment: { unitNumber: string };
  };
};

const INVOICE_INCLUDE = {
  lineItems: true,
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
  ) {}

  private formatInvoice(invoice: InvoiceRow): InvoiceResponse {
    const { totalAmount, paidAmount, status } = computeInvoiceSummary(
      invoice.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
      [], // no InvoicePayments module yet
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
}
