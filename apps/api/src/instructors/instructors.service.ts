import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@repo/db';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
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

/**
 * Service for managing gym instructors and related logic
 */
@Injectable()
export class InstructorsService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /** List all instructors for a gym with pagination */
  async findAll(
    gymId: string,
    options: { page?: number; limit?: number; isActive?: boolean },
  ): Promise<InstructorListResponse> {
    const { page = 1, limit = 25, isActive } = options;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('page and limit must be positive integers');
    }
    const skip = (page - 1) * limit;
    const where = { gymId, ...(isActive !== undefined && { isActive }) };

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
    actor: User,
  ): Promise<InstructorResponse> {
    const created = await this.prisma.instructor.create({
      data: {
        gymId,
        name: dto.name,
        email: dto.email === '' ? null : (dto.email ?? null),
        specialization:
          dto.specialization === '' ? null : (dto.specialization ?? null),
      },
      select: INSTRUCTOR_SELECT,
    });

    this.auditService
      .log({
        gymId,
        userId: actor.id,
        userName: actor.name,
        action: 'instructor.created',
        entityType: 'Instructor',
        entityId: created.id,
        entityName: created.name,
      })
      .catch(() => {});

    return created;
  }

  /** Update an instructor's details or active status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: InstructorUpdateRequest,
    actor: User,
  ): Promise<InstructorResponse> {
    const result = await this.prisma.instructor.updateMany({
      where: { id, gymId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && {
          email: dto.email === '' ? null : dto.email,
        }),
        ...(dto.specialization !== undefined && {
          specialization: dto.specialization === '' ? null : dto.specialization,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }

    const updated = await this.prisma.instructor.findUniqueOrThrow({
      where: { id },
      select: INSTRUCTOR_SELECT,
    });

    const action =
      dto.isActive === false ? 'instructor.deactivated' : 'instructor.updated';
    this.auditService
      .log({
        gymId,
        userId: actor.id,
        userName: actor.name,
        action,
        entityType: 'Instructor',
        entityId: updated.id,
        entityName: updated.name,
      })
      .catch(() => {});

    return updated;
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
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

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
