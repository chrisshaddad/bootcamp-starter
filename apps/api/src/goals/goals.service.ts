import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  GoalCreateRequest,
  GoalUpdateRequest,
  GoalListResponse,
  GoalResponse,
} from '@repo/contracts';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number; activeOnly?: boolean },
  ): Promise<GoalListResponse> {
    const { page = 1, limit = 20, activeOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    };

    const [goals, total] = await Promise.all([
      this.prisma.goal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.goal.count({ where }),
    ]);

    return {
      goals: goals.map((g) => this.toResponse(g)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<GoalResponse> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, organizationId },
    });

    if (!goal) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    return this.toResponse(goal);
  }

  async create(
    organizationId: string,
    createdById: string,
    data: GoalCreateRequest,
  ): Promise<GoalResponse> {
    const goal = await this.prisma.goal.create({
      data: {
        organizationId,
        createdById,
        type: data.type,
        period: data.period,
        targetAmount: data.targetAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description ?? null,
      },
    });

    this.logger.log(`Goal created: ${goal.id} for org ${organizationId}`);
    return this.toResponse(goal);
  }

  async update(
    id: string,
    organizationId: string,
    data: GoalUpdateRequest,
  ): Promise<GoalResponse> {
    await this.findOne(id, organizationId);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.period !== undefined && { period: data.period }),
        ...(data.targetAmount !== undefined && {
          targetAmount: data.targetAmount,
        }),
        ...(data.startDate !== undefined && {
          startDate: new Date(data.startDate),
        }),
        ...(data.endDate !== undefined && {
          endDate: new Date(data.endDate),
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    this.logger.log(`Goal updated: ${id}`);
    return this.toResponse(goal);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);
    await this.prisma.goal.delete({ where: { id } });
    this.logger.log(`Goal deleted: ${id}`);
  }

  private toResponse(g: any): GoalResponse {
    return {
      id: g.id,
      organizationId: g.organizationId,
      createdById: g.createdById,
      type: g.type,
      period: g.period,
      targetAmount: g.targetAmount.toString(),
      startDate:
        g.startDate instanceof Date
          ? g.startDate.toISOString().split('T')[0]
          : g.startDate,
      endDate:
        g.endDate instanceof Date
          ? g.endDate.toISOString().split('T')[0]
          : g.endDate,
      description: g.description,
      isActive: g.isActive,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }
}
