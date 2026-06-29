import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  InstructorListResponse,
  InstructorResponse,
  InstructorCreateRequest,
  InstructorUpdateRequest,
} from '@repo/contracts';

const INSTRUCTOR_SELECT = {
  id: true,
  gymId: true,
  name: true,
  email: true,
  specialization: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all instructors for a gym with pagination */
  async findAll(
    gymId: string,
    options: { page?: number; limit?: number },
  ): Promise<InstructorListResponse> {
    const { page = 1, limit = 25 } = options;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('page and limit must be positive integers');
    }
    const skip = (page - 1) * limit;
    const where = { gymId };

    const [instructors, total] = await Promise.all([
      this.prisma.instructor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: INSTRUCTOR_SELECT,
      }),
      this.prisma.instructor.count({ where }),
    ]);

    return { instructors, total };
  }

  /** Get a single instructor by ID, scoped to the caller's gym */
  async findOne(id: string, gymId: string): Promise<InstructorResponse> {
    const instructor = await this.prisma.instructor.findFirst({
      where: { id, gymId },
      select: INSTRUCTOR_SELECT,
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }

    return instructor;
  }

  /** Create a new instructor in the caller's gym */
  async create(
    gymId: string,
    dto: InstructorCreateRequest,
  ): Promise<InstructorResponse> {
    return this.prisma.instructor.create({
      data: {
        gymId,
        name: dto.name,
        email: dto.email ?? null,
        specialization: dto.specialization ?? null,
      },
      select: INSTRUCTOR_SELECT,
    });
  }

  /** Update an instructor's details or active status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: InstructorUpdateRequest,
  ): Promise<InstructorResponse> {
    const existing = await this.prisma.instructor.findFirst({
      where: { id, gymId },
    });
    if (!existing) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }

    return this.prisma.instructor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.specialization !== undefined && {
          specialization: dto.specialization,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: INSTRUCTOR_SELECT,
    });
  }

  /**
   * Return instructors with no overlapping non-cancelled session in the given window.
   * An instructor is available if they have NO session where:
   *   session.startsAt < endsAt AND session.endsAt > startsAt AND status != CANCELLED
   */
  async findAvailable(
    gymId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<InstructorResponse[]> {
    const instructors = await this.prisma.instructor.findMany({
      where: {
        gymId,
        isActive: true,
        gymSessions: {
          none: {
            status: { not: 'CANCELLED' },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        },
      },
      orderBy: { name: 'asc' },
      select: INSTRUCTOR_SELECT,
    });

    return instructors;
  }
}
