import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductListResponse,
  ProductResponse,
} from '@repo/contracts';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number; activeOnly?: boolean },
  ): Promise<ProductListResponse> {
    const { page = 1, limit = 20, activeOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => this.toResponse(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<ProductResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.toResponse(product);
  }

  async create(
    organizationId: string,
    data: ProductCreateRequest,
  ): Promise<ProductResponse> {
    const product = await this.prisma.product.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description ?? null,
        unitPrice: data.unitPrice,
        unitCost: data.unitCost ?? null,
        sku: data.sku ?? null,
        isActive: data.isActive ?? true,
      },
    });

    this.logger.log(`Product created: ${product.id} for org ${organizationId}`);
    return this.toResponse(product);
  }

  async update(
    id: string,
    organizationId: string,
    data: ProductUpdateRequest,
  ): Promise<ProductResponse> {
    await this.findOne(id, organizationId);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    this.logger.log(`Product updated: ${id}`);
    return this.toResponse(product);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);

    await this.prisma.product.delete({ where: { id } });
    this.logger.log(`Product deleted: ${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toResponse(p: any): ProductResponse {
    return {
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      description: p.description,
      unitPrice: p.unitPrice.toString(),
      unitCost: p.unitCost ? p.unitCost.toString() : null,
      sku: p.sku,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
