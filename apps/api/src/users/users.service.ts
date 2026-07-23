import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type UserRole } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { UserListResponse, UserSummary } from '@repo/contracts';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isConfirmed: true,
  organizationId: true,
  createdAt: true,
  organization: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.UserSelect;

interface FindAllOptions {
  search?: string;
  role?: UserRole;
  organizationId?: string;
  isConfirmed?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Platform-wide user administration for SUPER_ADMIN. NOT tenant-scoped — a
 * super admin sees and manages every user across all libraries.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions = {}): Promise<UserListResponse> {
    const {
      search,
      role,
      organizationId,
      isConfirmed,
      page = 1,
      limit = 20,
    } = options;
    const trimmed = search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(organizationId ? { organizationId } : {}),
      ...(isConfirmed !== undefined ? { isConfirmed } : {}),
      ...(trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: 'insensitive' } },
              { email: { contains: trimmed, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findOne(id: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async changeRole(
    id: string,
    actingUserId: string,
    role: UserRole,
  ): Promise<UserSummary> {
    this.assertNotSelf(id, actingUserId, 'change your own role');
    await this.requireUser(id);

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });
  }

  async unlinkOrganization(
    id: string,
    actingUserId: string,
  ): Promise<UserSummary> {
    this.assertNotSelf(id, actingUserId, 'unlink yourself');
    await this.requireUser(id);

    return this.prisma.user.update({
      where: { id },
      data: { organizationId: null },
      select: userSelect,
    });
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    this.assertNotSelf(id, actingUserId, 'delete your own account');
    await this.requireUser(id);

    // Cascades sessions/magic-links/profile; LibraryMember.userId is SetNull.
    await this.prisma.user.delete({ where: { id } });
  }

  private assertNotSelf(id: string, actingUserId: string, action: string) {
    if (id === actingUserId) {
      throw new BadRequestException(`You cannot ${action}.`);
    }
  }

  private async requireUser(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
