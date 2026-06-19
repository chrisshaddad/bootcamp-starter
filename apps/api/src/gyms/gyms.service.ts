import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { GymStatus } from '@repo/db';
import type { GymListResponse, GymDetailResponse } from '@repo/contracts';

@Injectable()
export class GymsService {
  private readonly logger = new Logger(GymsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Get all gyms with optional status filter */
  async findAll(options: {
    status?: GymStatus;
    page?: number;
    limit?: number;
  }): Promise<GymListResponse> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [gyms, total] = await Promise.all([
      this.prisma.gym.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          website: true,
          createdAt: true,
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
      this.prisma.gym.count({ where }),
    ]);

    return { gyms, total };
  }

  /** Get a single gym by ID with full details */
  async findOne(id: string): Promise<GymDetailResponse> {
    const gym = await this.prisma.gym.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        approvedBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!gym) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    return gym;
  }

  /** Approve a gym (set status to ACTIVE) */
  async approve(id: string, approvedById: string): Promise<GymDetailResponse> {
    const existing = await this.prisma.gym.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    return this.prisma.gym.update({
      where: { id },
      data: { status: 'ACTIVE', approvedById, approvedAt: new Date() },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        approvedBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });
  }

  /** Reject a gym (set status to REJECTED) */
  async reject(id: string): Promise<GymDetailResponse> {
    const existing = await this.prisma.gym.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    return this.prisma.gym.update({
      where: { id },
      data: { status: 'REJECTED' },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        approvedBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });
  }
}
