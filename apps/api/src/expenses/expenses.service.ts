import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
  ExpenseListResponse,
  ExpenseResponse,
  ExpenseQuery,
} from '@repo/contracts';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    query: ExpenseQuery,
  ): Promise<ExpenseListResponse> {
    const { page = 1, limit = 20, categoryId, dateFrom, dateTo, search } =
      query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (categoryId) where.categoryId = categoryId;

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          category: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      expenses: expenses.map((e) => this.toResponse(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }

    return this.toResponse(expense);
  }

  async create(
    organizationId: string,
    createdById: string,
    data: ExpenseCreateRequest,
  ): Promise<ExpenseResponse> {
    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        createdById,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        categoryId: data.categoryId ?? null,
        recurrence: data.recurrence ?? 'NONE',
        notes: data.notes ?? null,
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(
      `Expense created: ${expense.id} for org ${organizationId}`,
    );
    return this.toResponse(expense);
  }

  async update(
    id: string,
    organizationId: string,
    data: ExpenseUpdateRequest,
  ): Promise<ExpenseResponse> {
    await this.findOne(id, organizationId);

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.recurrence !== undefined && {
          recurrence: data.recurrence,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Expense updated: ${id}`);
    return this.toResponse(expense);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);
    await this.prisma.expense.delete({ where: { id } });
    this.logger.log(`Expense deleted: ${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toResponse(e: any): ExpenseResponse {
    return {
      id: e.id,
      organizationId: e.organizationId,
      categoryId: e.categoryId,
      createdById: e.createdById,
      description: e.description,
      amount: e.amount.toString(),
      date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date,
      recurrence: e.recurrence,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      category: e.category
        ? {
            id: e.category.id,
            organizationId: e.category.organizationId,
            name: e.category.name,
            description: e.category.description,
            color: e.category.color,
            isDefault: e.category.isDefault,
            createdAt: e.category.createdAt.toISOString(),
            updatedAt: e.category.updatedAt.toISOString(),
          }
        : null,
      createdBy: e.createdBy,
    };
  }
}
