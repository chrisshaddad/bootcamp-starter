import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  AuthorResponse,
  AuthorListResponse,
  AuthorCreateRequest,
  AuthorUpdateRequest,
} from '@repo/contracts';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List authors for an organization
   */
  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number },
  ): Promise<AuthorListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [authors, total] = await Promise.all([
      this.prisma.author.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.author.count({ where: { organizationId } }),
    ]);

    return { authors, total };
  }

  /**
   * Get a single author, scoped to the organization
   */
  async findOne(organizationId: string, id: string): Promise<AuthorResponse> {
    const author = await this.prisma.author.findFirst({
      where: { id, organizationId },
    });

    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    return author;
  }

  /**
   * Create an author within the organization
   */
  async create(
    organizationId: string,
    data: AuthorCreateRequest,
  ): Promise<AuthorResponse> {
    return this.prisma.author.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  /**
   * Update an author, scoped to the organization
   */
  async update(
    organizationId: string,
    id: string,
    data: AuthorUpdateRequest,
  ): Promise<AuthorResponse> {
    // Verify the author exists within this organization before updating
    const existing = await this.prisma.author.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    return this.prisma.author.update({
      where: { id },
      data,
    });
  }
}
