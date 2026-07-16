import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
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
    options: { page?: number; limit?: number; search?: string },
  ): Promise<AuthorListResponse> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;
    const where: Prisma.AuthorWhereInput = {
      organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [authors, total] = await Promise.all([
      this.prisma.author.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.author.count({ where }),
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

  /**
   * Delete an author, scoped to the organization. Blocked (409) while the
   * author is still linked to books, so deleting never silently unlinks a
   * book (the BookAuthor join cascades at the DB level otherwise).
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.author.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    const linkedBooks = await this.prisma.bookAuthor.count({
      where: { authorId: id, organizationId },
    });

    if (linkedBooks > 0) {
      throw new ConflictException(
        `Cannot delete author "${existing.name}" — it is linked to ${linkedBooks} book(s).`,
      );
    }

    await this.prisma.author.delete({ where: { id } });
  }
}
