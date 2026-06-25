import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
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
    try {
      return await this.prisma.membershipPlan.create({
        data: {
          gymId,
          name: dto.name,
          description: dto.description ?? null,
          durationDays: dto.durationDays,
          price: dto.price,
        },
        select: PLAN_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A plan with this name already exists');
      }
      throw err;
    }
  }

  /** Update a membership plan's details or active status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: PlanUpdateRequest,
  ): Promise<PlanResponse> {
    let count: number;
    try {
      ({ count } = await this.prisma.membershipPlan.updateMany({
        where: { id, gymId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.durationDays !== undefined && {
            durationDays: dto.durationDays,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      }));
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A plan with this name already exists');
      }
      throw err;
    }

    if (count === 0) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return this.prisma.membershipPlan.findFirstOrThrow({
      where: { id, gymId },
      select: PLAN_SELECT,
    });
  }
}
