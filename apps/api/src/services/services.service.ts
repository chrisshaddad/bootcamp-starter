import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Service } from '@repo/db';
import type {
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ServiceListResponse,
  ServiceResponse,
} from '@repo/contracts';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number; activeOnly?: boolean },
  ): Promise<ServiceListResponse> {
    const { page = 1, limit = 20, activeOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    };

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      services: services.map((service) => this.toResponse(service)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<ServiceResponse> {
    const service = await this.prisma.service.findFirst({
      where: { id, organizationId },
    });

    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    return this.toResponse(service);
  }

  async create(
    organizationId: string,
    data: ServiceCreateRequest,
  ): Promise<ServiceResponse> {
    const normalizedDescription = this.normalizeOptionalString(
      data.description,
    );
    const normalizedUnitCost = this.normalizeOptionalString(data.unitCost);
    const normalizedSku = this.normalizeOptionalString(data.sku);

    const service = await this.prisma.service.create({
      data: {
        organizationId,
        name: data.name,
        description: normalizedDescription,
        unitPrice: data.unitPrice,
        unitCost: normalizedUnitCost,
        sku: normalizedSku,
        isActive: data.isActive ?? true,
      },
    });

    this.logger.log(`Service created: ${service.id} for org ${organizationId}`);
    return this.toResponse(service);
  }

  async update(
    id: string,
    organizationId: string,
    data: ServiceUpdateRequest,
  ): Promise<ServiceResponse> {
    await this.findOne(id, organizationId);

    const service = await this.prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: this.normalizeOptionalString(data.description),
        }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.unitCost !== undefined && {
          unitCost: this.normalizeOptionalString(data.unitCost),
        }),
        ...(data.sku !== undefined && {
          sku: this.normalizeOptionalString(data.sku),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    this.logger.log(`Service updated: ${id}`);
    return this.toResponse(service);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);

    await this.prisma.service.delete({ where: { id } });
    this.logger.log(`Service deleted: ${id}`);
  }

  private normalizeOptionalString(value?: string | null): string | null {
    return value?.trim() ? value.trim() : null;
  }

  private toResponse(service: Service): ServiceResponse {
    return {
      id: service.id,
      organizationId: service.organizationId,
      name: service.name,
      description: service.description,
      unitPrice: service.unitPrice.toString(),
      unitCost: service.unitCost ? service.unitCost.toString() : null,
      sku: service.sku,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }
}
