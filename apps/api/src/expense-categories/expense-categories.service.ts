import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ExpenseCategoryCreateRequest,
  ExpenseCategoryResponse,
} from '@repo/contracts';

@Injectable()
export class ExpenseCategoriesService {
  private readonly logger = new Logger(ExpenseCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<ExpenseCategoryResponse[]> {
    const categories = await this.prisma.expenseCategory.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return categories.map((c) => this.toResponse(c));
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<ExpenseCategoryResponse> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, organizationId },
    });

    if (!category) {
      throw new NotFoundException(`Expense category ${id} not found`);
    }

    return this.toResponse(category);
  }

  async create(
    organizationId: string,
    data: ExpenseCategoryCreateRequest,
  ): Promise<ExpenseCategoryResponse> {
    // Check uniqueness
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { organizationId, name: data.name },
    });

    if (existing) {
      throw new ConflictException(
        `A category named "${data.name}" already exists`,
      );
    }

    const category = await this.prisma.expenseCategory.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? '#6366f1',
      },
    });

    this.logger.log(
      `Expense category created: ${category.id} for org ${organizationId}`,
    );
    return this.toResponse(category);
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<ExpenseCategoryCreateRequest>,
  ): Promise<ExpenseCategoryResponse> {
    await this.findOne(id, organizationId);

    if (data.name) {
      const existing = await this.prisma.expenseCategory.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException(
          `A category named "${data.name}" already exists`,
        );
      }
    }

    const category = await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    this.logger.log(`Expense category updated: ${id}`);
    return this.toResponse(category);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const category = await this.findOne(id, organizationId);

    if (category.isDefault) {
      throw new ConflictException('Cannot delete a default category');
    }

    await this.prisma.expenseCategory.delete({ where: { id } });
    this.logger.log(`Expense category deleted: ${id}`);
  }

  async seedDefaults(organizationId: string): Promise<void> {
    const defaults = [
      { name: 'Rent & Utilities', color: '#f59e0b' },
      { name: 'Salaries & Wages', color: '#3b82f6' },
      { name: 'Marketing', color: '#ec4899' },
      { name: 'Software & Tools', color: '#8b5cf6' },
      { name: 'Office Supplies', color: '#14b8a6' },
      { name: 'Travel', color: '#f97316' },
      { name: 'Other', color: '#6b7280' },
    ];

    for (const d of defaults) {
      await this.prisma.expenseCategory.upsert({
        where: { organizationId_name: { organizationId, name: d.name } },
        create: {
          organizationId,
          name: d.name,
          color: d.color,
          isDefault: true,
        },
        update: {},
      });
    }

    this.logger.log(`Default categories seeded for org ${organizationId}`);
  }

  private toResponse(c: any): ExpenseCategoryResponse {
    return {
      id: c.id,
      organizationId: c.organizationId,
      name: c.name,
      description: c.description,
      color: c.color,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
