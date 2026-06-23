import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PlanListResponse,
  PlanResponse,
  PlanCreateRequest,
  PlanUpdateRequest,
} from '@repo/contracts';

const PLAN_SELECT = {
  id: true,
  gymId: true,
  name: true,
  description: true,
  durationDays: true,
  price: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all membership plans for a gym with optional isActive filter and pagination */
  async findAll(
    gymId: string,
    options: { isActive?: boolean; page?: number; limit?: number },
  ): Promise<PlanListResponse> {
    const { isActive, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = {
      gymId,
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const [plans, total] = await Promise.all([
      this.prisma.membershipPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: PLAN_SELECT,
      }),
      this.prisma.membershipPlan.count({ where }),
    ]);

    return { plans, total };
  }

  /** Get a single membership plan by ID, scoped to the caller's gym */
  async findOne(id: string, gymId: string): Promise<PlanResponse> {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id, gymId },
      select: PLAN_SELECT,
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  /** Create a new membership plan in the caller's gym */
  async create(gymId: string, dto: PlanCreateRequest): Promise<PlanResponse> {
    return this.prisma.membershipPlan.create({
      data: {
        gymId,
        name: dto.name,
        description: dto.description ?? null,
        durationDays: dto.durationDays,
        price: dto.price,
      },
      select: PLAN_SELECT,
    });
  }

  /** Update a membership plan's details or active status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: PlanUpdateRequest,
  ): Promise<PlanResponse> {
    const existing = await this.prisma.membershipPlan.findFirst({
      where: { id, gymId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return this.prisma.membershipPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationDays !== undefined && {
          durationDays: dto.durationDays,
        }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: PLAN_SELECT,
    });
  }
}
