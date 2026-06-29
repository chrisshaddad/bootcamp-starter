import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Logger } from '@nestjs/common';
import type {
  SessionListResponse,
  SessionResponse,
  SessionCreateRequest,
  SessionUpdateRequest,
} from '@repo/contracts';

const SESSION_SELECT = {
  id: true,
  gymId: true,
  title: true,
  description: true,
  instructorId: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  instructor: {
    select: {
      id: true,
      gymId: true,
      name: true,
      email: true,
      specialization: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  _count: {
    select: { bookings: true },
  },
} as const;

/**
 * Service for managing gym sessions and related logic
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List all sessions for a gym with optional date filtering */
  async findAll(
    gymId: string,
    options: { startDate?: string; endDate?: string },
  ): Promise<SessionListResponse> {
    const { startDate, endDate } = options;
    const where: any = { gymId };

    if (startDate || endDate) {
      where.startsAt = {};
      if (startDate) where.startsAt.gte = new Date(startDate);
      if (endDate) where.startsAt.lte = new Date(endDate);
    }

    const sessions = await this.prisma.gymSession.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      select: SESSION_SELECT,
    });

    return sessions as unknown as SessionListResponse; // Prisma typing workaround for instructor nullability
  }

  /** Get a single session by ID, scoped to the caller's gym */
  async findOne(id: string, gymId: string): Promise<SessionResponse> {
    const session = await this.prisma.gymSession.findFirst({
      where: { id, gymId },
      select: SESSION_SELECT,
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session as unknown as SessionResponse;
  }

  /** Create a new session in the caller's gym */
  async create(
    gymId: string,
    dto: SessionCreateRequest,
  ): Promise<SessionResponse> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findFirst({
        where: { id: dto.instructorId, gymId },
      });
      if (!instructor) {
        throw new BadRequestException(
          'Instructor not found or does not belong to this gym',
        );
      }
    }

    const session = await this.prisma.gymSession.create({
      data: {
        gymId,
        title: dto.title,
        description: dto.description === '' ? null : (dto.description ?? null),
        instructorId: dto.instructorId || null,
        startsAt,
        endsAt,
        capacity: dto.capacity,
      },
      select: SESSION_SELECT,
    });

    return session as unknown as SessionResponse;
  }

  /** Update a session's details, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: SessionUpdateRequest,
  ): Promise<SessionResponse> {
    const existing = await this.prisma.gymSession.findFirst({
      where: { id, gymId },
    });
    if (!existing) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;

    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findFirst({
        where: { id: dto.instructorId, gymId },
      });
      if (!instructor) {
        throw new BadRequestException(
          'Instructor not found or does not belong to this gym',
        );
      }
    }

    const result = await this.prisma.gymSession.updateMany({
      where: { id, gymId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description === '' ? null : dto.description,
        }),
        ...(dto.instructorId !== undefined && {
          instructorId: dto.instructorId || null,
        }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: new Date(dto.endsAt) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    const session = await this.prisma.gymSession.findFirstOrThrow({
      where: { id, gymId },
      select: SESSION_SELECT,
    });

    return session as unknown as SessionResponse;
  }

  /** Cancel a session */
  async cancel(id: string, gymId: string): Promise<SessionResponse> {
    const result = await this.prisma.gymSession.updateMany({
      where: { id, gymId },
      data: { status: 'CANCELLED' },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    const session = await this.prisma.gymSession.findFirstOrThrow({
      where: { id, gymId },
      select: SESSION_SELECT,
    });
    return session as unknown as SessionResponse;
  }
}
