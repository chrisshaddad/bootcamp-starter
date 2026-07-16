import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
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
    options: { page?: number; limit?: number; search?: string },
  ): Promise<PublisherListResponse> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;
    const where: Prisma.PublisherWhereInput = {
      organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [publishers, total] = await Promise.all([
      this.prisma.publisher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.publisher.count({ where }),
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

  /**
   * Delete a publisher, scoped to the organization. Blocked (409) while books
   * still reference it, so deleting never silently nulls a book's publisher
   * (the relation is onDelete: SetNull at the DB level otherwise).
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.publisher.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Publisher with ID ${id} not found`);
    }

    const linkedBooks = await this.prisma.book.count({
      where: { publisherId: id, organizationId },
    });

    if (linkedBooks > 0) {
      throw new ConflictException(
        `Cannot delete publisher "${existing.name}" — it is referenced by ${linkedBooks} book(s).`,
      );
    }

    await this.prisma.publisher.delete({ where: { id } });
  }
}
