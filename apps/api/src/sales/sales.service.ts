import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  SaleCreateRequest,
  SaleUpdateRequest,
  SaleListResponse,
  SaleResponse,
  SaleQuery,
} from '@repo/contracts';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    query: SaleQuery,
  ): Promise<SaleListResponse> {
    const { page = 1, limit = 20, productId, dateFrom, dateTo, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (productId) where.productId = productId;

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          product: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      sales: sales.map((s) => this.toResponse(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<SaleResponse> {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: {
        product: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale ${id} not found`);
    }

    return this.toResponse(sale);
  }

  async create(
    organizationId: string,
    createdById: string,
    data: SaleCreateRequest,
  ): Promise<SaleResponse> {
    const sale = await this.prisma.sale.create({
      data: {
        organizationId,
        createdById,
        productId: data.productId ?? null,
        description: data.description ?? null,
        quantity: data.quantity ?? '1',
        unitPrice: data.unitPrice,
        unitCost: data.unitCost ?? null,
        date: new Date(data.date),
        recurrence: data.recurrence ?? 'NONE',
        notes: data.notes ?? null,
      },
      include: {
        product: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Sale created: ${sale.id} for org ${organizationId}`);
    return this.toResponse(sale);
  }

  async update(
    id: string,
    organizationId: string,
    data: SaleUpdateRequest,
  ): Promise<SaleResponse> {
    await this.findOne(id, organizationId);

    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.recurrence !== undefined && {
          recurrence: data.recurrence,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        product: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Sale updated: ${id}`);
    return this.toResponse(sale);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);
    await this.prisma.sale.delete({ where: { id } });
    this.logger.log(`Sale deleted: ${id}`);
  }

  toResponse(s: any): SaleResponse {
    const qty = parseFloat(s.quantity.toString());
    const price = parseFloat(s.unitPrice.toString());
    const cost = s.unitCost ? parseFloat(s.unitCost.toString()) : null;
    const revenue = (qty * price).toFixed(2);
    const grossProfit =
      cost !== null ? ((price - cost) * qty).toFixed(2) : null;

    return {
      id: s.id,
      organizationId: s.organizationId,
      productId: s.productId,
      createdById: s.createdById,
      description: s.description,
      quantity: s.quantity.toString(),
      unitPrice: s.unitPrice.toString(),
      unitCost: s.unitCost ? s.unitCost.toString() : null,
      date:
        s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date,
      recurrence: s.recurrence,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      revenue,
      grossProfit: grossProfit ?? undefined,
      product: s.product
        ? {
            id: s.product.id,
            organizationId: s.product.organizationId,
            name: s.product.name,
            description: s.product.description,
            unitPrice: s.product.unitPrice.toString(),
            unitCost: s.product.unitCost ? s.product.unitCost.toString() : null,
            sku: s.product.sku,
            isActive: s.product.isActive,
            createdAt: s.product.createdAt.toISOString(),
            updatedAt: s.product.updatedAt.toISOString(),
          }
        : null,
      createdBy: s.createdBy,
    };
  }
}
