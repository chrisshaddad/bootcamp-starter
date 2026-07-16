import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  CategoryResponse,
  CategoryListResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from '@repo/contracts';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List categories for an organization
   */
  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number; search?: string },
  ): Promise<CategoryListResponse> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;
    const where: Prisma.CategoryWhereInput = {
      organizationId,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { categories, total };
  }

  /**
   * Get a single category, scoped to the organization
   */
  async findOne(organizationId: string, id: string): Promise<CategoryResponse> {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Create a category within the organization
   */
  async create(
    organizationId: string,
    data: CategoryCreateRequest,
  ): Promise<CategoryResponse> {
    try {
      return await this.prisma.category.create({
        data: {
          ...data,
          organizationId,
        },
      });
    } catch (error) {
      throw this.mapDuplicateNameError(error, data.name);
    }
  }

  /**
   * Update a category, scoped to the organization
   */
  async update(
    organizationId: string,
    id: string,
    data: CategoryUpdateRequest,
  ): Promise<CategoryResponse> {
    // Verify the category exists within this organization before updating
    const existing = await this.prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw this.mapDuplicateNameError(error, data.name ?? existing.name);
    }
  }

  /**
   * Delete a category, scoped to the organization. Blocked (409) while it is
   * still linked to books (the BookCategory join cascades otherwise).
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const linkedBooks = await this.prisma.bookCategory.count({
      where: { categoryId: id, organizationId },
    });

    if (linkedBooks > 0) {
      throw new ConflictException(
        `Cannot delete category "${existing.name}" — it is linked to ${linkedBooks} book(s).`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  // Category.name is unique per organization (@@unique([organizationId, name])),
  // unlike Author. Surface the collision as a 409 instead of letting Prisma's
  // P2002 bubble up as an unhandled 500.
  private mapDuplicateNameError(error: unknown, name: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(`A category named "${name}" already exists`);
    }

    return error as Error;
  }
}
