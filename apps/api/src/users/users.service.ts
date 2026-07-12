import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Prisma, type User, type UserRole } from '@repo/db';
import type {
  UserCreateRequest,
  UserUpdateRequest,
  UserListQuery,
  UserListResponse,
  UserDetailResponse,
} from '@repo/contracts';

// Roles this module manages. PATIENT lives in the Patients module.
const MANAGED_ROLES: UserRole[] = ['STAFF', 'PROFESSIONAL'];

const withProfile = {
  professionalProfile: { select: { specialty: true, bio: true } },
} as const;

type UserWithProfile = User & {
  professionalProfile: { specialty: string; bio: string | null } | null;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private toDetail(user: UserWithProfile): UserDetailResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isConfirmed: user.isConfirmed,
      institutionId: user.institutionId,
      specialty: user.professionalProfile?.specialty ?? null,
      bio: user.professionalProfile?.bio ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findAll(
    query: UserListQuery,
    actor: User,
  ): Promise<UserListResponse> {
    const { role, isActive, search, page, limit } = query;
    const skip = (page - 1) * limit;

    // Staff can only ever see professionals (for care-team assignment),
    // regardless of the requested role filter.
    const roleFilter = actor.role === 'STAFF' ? 'PROFESSIONAL' : role;

    const where: Prisma.UserWhereInput = {
      institutionId: actor.institutionId,
      role: roleFilter ? roleFilter : { in: MANAGED_ROLES },
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: withProfile,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isConfirmed: user.isConfirmed,
        specialty: user.professionalProfile?.specialty ?? null,
        createdAt: user.createdAt,
      })),
      total,
    };
  }

  async findOne(
    id: string,
    institutionId: string,
  ): Promise<UserDetailResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id, institutionId, role: { in: MANAGED_ROLES } },
      include: withProfile,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toDetail(user);
  }

  async create(
    data: UserCreateRequest,
    actor: User,
  ): Promise<UserDetailResponse> {
    let createdId: string;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName: data.fullName,
            email: data.email.toLowerCase(),
            phone: data.phone,
            role: data.role,
            institutionId: actor.institutionId,
            createdById: actor.id,
          },
        });

        if (data.role === 'PROFESSIONAL') {
          await tx.professionalProfile.create({
            data: {
              userId: user.id,
              specialty: data.specialty as string,
              bio: data.bio ?? null,
            },
          });
        }

        return user;
      });
      createdId = created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn(
          `User creation rejected: email ${data.email} already in use`,
        );
        throw new ConflictException(
          `A user with email ${data.email} already exists`,
        );
      }
      throw error;
    }

    await this.sendInvitationFor(createdId, actor);
    this.logger.log(`User ${createdId} created by ${actor.id}`);
    return this.findOne(createdId, actor.institutionId);
  }

  async update(
    id: string,
    data: UserUpdateRequest,
    institutionId: string,
  ): Promise<UserDetailResponse> {
    const existing = await this.prisma.user.findFirst({
      where: { id, institutionId, role: { in: MANAGED_ROLES } },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
        },
      });

      // specialty/bio only apply to professionals
      if (
        existing.role === 'PROFESSIONAL' &&
        (data.specialty !== undefined || data.bio !== undefined)
      ) {
        await tx.professionalProfile.update({
          where: { userId: id },
          data: {
            ...(data.specialty !== undefined
              ? { specialty: data.specialty }
              : {}),
            ...(data.bio !== undefined ? { bio: data.bio } : {}),
          },
        });
      }
    });

    return this.findOne(id, institutionId);
  }

  async setStatus(
    id: string,
    isActive: boolean,
    actor: User,
  ): Promise<UserDetailResponse> {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, institutionId: actor.institutionId, role: { in: MANAGED_ROLES } },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.update({ where: { id }, data: { isActive } });
    this.logger.log(`User ${id} ${isActive ? 'reactivated' : 'deactivated'}`);
    return this.findOne(id, actor.institutionId);
  }

  private async sendInvitationFor(userId: string, actor: User): Promise<void> {
    const [user, institution] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true },
      }),
      this.prisma.institution.findUniqueOrThrow({
        where: { id: actor.institutionId },
        select: { name: true },
      }),
    ]);

    await this.authService.sendInvitation(user, actor.fullName, institution.name);
  }
}
