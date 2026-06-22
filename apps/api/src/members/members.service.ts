import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { MemberStatus } from '@repo/db';
import type {
  MemberListResponse,
  MemberResponse,
  MemberCreateRequest,
  MemberUpdateRequest,
} from '@repo/contracts';

const MEMBER_SELECT = {
  id: true,
  gymId: true,
  userId: true,
  name: true,
  email: true,
  phoneNumber: true,
  dateOfBirth: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all members for a gym with optional status filter and pagination */
  async findAll(
    gymId: string,
    options: { status?: MemberStatus; page?: number; limit?: number },
  ): Promise<MemberListResponse> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = { gymId, ...(status ? { status } : {}) };

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: MEMBER_SELECT,
      }),
      this.prisma.member.count({ where }),
    ]);

    return { members, total };
  }

  /** Get a single member by ID, scoped to the caller's gym */
  async findOne(id: string, gymId: string): Promise<MemberResponse> {
    const member = await this.prisma.member.findFirst({
      where: { id, gymId },
      select: MEMBER_SELECT,
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return member;
  }

  /** Create a new member in the caller's gym */
  async create(
    gymId: string,
    dto: MemberCreateRequest,
  ): Promise<MemberResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const emailConflict = await this.prisma.member.findFirst({
      where: { gymId, email: normalizedEmail },
      select: { id: true },
    });
    if (emailConflict) {
      throw new ConflictException(
        'A member with this email already exists in this gym',
      );
    }

    const phoneConflict = await this.prisma.member.findFirst({
      where: { gymId, phoneNumber: dto.phoneNumber },
      select: { id: true },
    });
    if (phoneConflict) {
      throw new ConflictException(
        'A member with this phone number already exists in this gym',
      );
    }

    try {
      return await this.prisma.member.create({
        data: {
          gymId,
          name: dto.name,
          email: normalizedEmail,
          phoneNumber: dto.phoneNumber,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        },
        select: MEMBER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A member with this email or phone number already exists in this gym',
        );
      }
      throw err;
    }
  }

  /** Update a member's details or status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: MemberUpdateRequest,
  ): Promise<MemberResponse> {
    const existing = await this.prisma.member.findFirst({
      where: { id, gymId },
    });
    if (!existing) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (
      dto.phoneNumber !== undefined &&
      dto.phoneNumber !== existing.phoneNumber
    ) {
      const phoneConflict = await this.prisma.member.findFirst({
        where: { gymId, phoneNumber: dto.phoneNumber, id: { not: id } },
        select: { id: true },
      });
      if (phoneConflict) {
        throw new ConflictException(
          'A member with this phone number already exists in this gym',
        );
      }
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      select: MEMBER_SELECT,
    });
  }
}
