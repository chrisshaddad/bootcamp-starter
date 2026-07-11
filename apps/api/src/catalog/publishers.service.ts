import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublisherResponse,
  PublisherListResponse,
  PublisherCreateRequest,
  PublisherUpdateRequest,
} from '@repo/contracts';

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List publishers for an organization
   */
  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number },
  ): Promise<PublisherListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [publishers, total] = await Promise.all([
      this.prisma.publisher.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.publisher.count({ where: { organizationId } }),
    ]);

    return { publishers, total };
  }

  /**
   * Get a single publisher, scoped to the organization
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PublisherResponse> {
    const publisher = await this.prisma.publisher.findFirst({
      where: { id, organizationId },
    });

    if (!publisher) {
      throw new NotFoundException(`Publisher with ID ${id} not found`);
    }

    return publisher;
  }

  /**
   * Create a publisher within the organization
   */
  async create(
    organizationId: string,
    data: PublisherCreateRequest,
  ): Promise<PublisherResponse> {
    return this.prisma.publisher.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  /**
   * Update a publisher, scoped to the organization
   */
  async update(
    organizationId: string,
    id: string,
    data: PublisherUpdateRequest,
  ): Promise<PublisherResponse> {
    // Verify the publisher exists within this organization before updating
    const existing = await this.prisma.publisher.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Publisher with ID ${id} not found`);
    }

    return this.prisma.publisher.update({
      where: { id },
      data,
    });
  }
}
