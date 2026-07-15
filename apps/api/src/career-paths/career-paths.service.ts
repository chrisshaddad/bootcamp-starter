import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  CareerPathCreateRequest,
  CareerPathResponse,
  CareerPathListResponse,
} from '@repo/contracts';

@Injectable()
export class CareerPathsService {
  private readonly logger = new Logger(CareerPathsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: User): Promise<CareerPathListResponse> {
    const [careerPaths, total] = await Promise.all([
      this.prisma.careerPath.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.careerPath.count({
        where: { userId: currentUser.id },
      }),
    ]);

    return {
      careerPaths: careerPaths.map((cp) => this.toResponse(cp)),
      total,
    };
  }

  async findOne(id: string, currentUser: User): Promise<CareerPathResponse> {
    const careerPath = await this.prisma.careerPath.findFirst({
      where: { id, userId: currentUser.id },
    });

    if (!careerPath) {
      throw new NotFoundException(`Career path with ID ${id} not found`);
    }

    return this.toResponse(careerPath);
  }

  async create(
    data: CareerPathCreateRequest,
    currentUser: User,
  ): Promise<CareerPathResponse> {
    const careerPath = await this.prisma.careerPath.create({
      data: {
        userId: currentUser.id,
        targetTitle: data.targetTitle,
        timeframeMonths: data.timeframeMonths,
        milestones: [], // AI will populate this later
      },
    });

    return this.toResponse(careerPath);
  }

  async delete(id: string, currentUser: User): Promise<void> {
    const careerPath = await this.prisma.careerPath.findFirst({
      where: { id, userId: currentUser.id },
    });

    if (!careerPath) {
      throw new NotFoundException(`Career path with ID ${id} not found`);
    }

    await this.prisma.careerPath.delete({ where: { id } });
  }

  private toResponse(careerPath: {
    id: string;
    userId: string;
    targetTitle: string;
    timeframeMonths: number;
    milestones: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): CareerPathResponse {
    return {
      id: careerPath.id,
      userId: careerPath.userId,
      targetTitle: careerPath.targetTitle,
      timeframeMonths: careerPath.timeframeMonths,
      milestones: careerPath.milestones,
      createdAt: careerPath.createdAt,
      updatedAt: careerPath.updatedAt,
    };
  }
}
