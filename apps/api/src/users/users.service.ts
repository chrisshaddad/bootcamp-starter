import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserActionResponse,
  UserListResponse,
} from '@repo/contracts';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isConfirmed: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all users within an organization (Org Admin only, own org)
   */
  async findAllForOrg(
    organizationId: string,
    options: { page?: number; limit?: number },
  ): Promise<UserListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where: { organizationId } }),
    ]);

    return { users, total };
  }

  /**
   * Create a user within the creator's organization.
   * organizationId is always derived from the creator, never from the request body.
   * A Receptionist can only ever create MEMBER accounts, regardless of the
   * role sent in the request (defense in depth on top of the FE not exposing a picker).
   */
  async create(
    creator: Pick<User, 'organizationId' | 'role'>,
    dto: CreateUserRequest,
  ): Promise<UserActionResponse> {
    if (!creator.organizationId) {
      throw new ForbiddenException(
        'Only users associated with an organization can create users',
      );
    }

    const role = creator.role === 'RECEPTIONIST' ? 'MEMBER' : dto.role;

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          role,
          organizationId: creator.organizationId,
        },
        select: USER_SELECT,
      });

      this.logger.log(
        `Created user ${user.id} (${role}) in organization ${creator.organizationId}`,
      );

      return { user };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A user with email ${dto.email} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Update a user's name/role. Restricted to users within the caller's own organization.
   */
  async update(
    organizationId: string,
    targetUserId: string,
    dto: UpdateUserRequest,
  ): Promise<UserActionResponse> {
    // Tenant-scoped lookup: never read a row belonging to another org.
    const existing = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    const user = await this.prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
      select: USER_SELECT,
    });

    this.logger.log(
      `Updated user ${user.id} in organization ${organizationId}`,
    );

    return { user };
  }
}
