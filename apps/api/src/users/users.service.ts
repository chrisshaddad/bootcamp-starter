import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from '../auth/session.service';
import type {
  UserListQuery,
  UserListResponse,
  UserAccountResponse,
  UserCreateRequest,
  UserUpdateRequest,
} from '@repo/contracts';

const accountSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  isConfirmed: true,
  title: true,
  level: true,
  createdAt: true,
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  manager: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async findAll(
    query: UserListQuery,
    currentUser: User,
  ): Promise<UserListResponse> {
    const skip = (query.page - 1) * query.limit;

    // An ORG_ADMIN only ever sees their own organization's users - the
    // requested organizationId is ignored so it can't be used to read across
    // tenants. SUPER_ADMIN may filter by any organization.
    const organizationId =
      currentUser.role === 'SUPER_ADMIN'
        ? query.organizationId
        : currentUser.organizationId;

    const where: Prisma.UserWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: accountSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findOne(id: string, currentUser: User): Promise<UserAccountResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: accountSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.assertManageable(user.organization?.id ?? null, currentUser);

    return user;
  }

  async create(
    data: UserCreateRequest,
    currentUser: User,
  ): Promise<UserAccountResponse> {
    const email = data.email.toLowerCase();

    // An ORG_ADMIN can only create users inside their own organization, and
    // may not mint platform admins. SUPER_ADMIN keeps full control.
    const organizationId =
      currentUser.role === 'SUPER_ADMIN'
        ? data.organizationId
        : currentUser.organizationId;
    this.assertAssignableRole(data.role, currentUser);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    if (organizationId) {
      await this.assertOrganizationExists(organizationId);
      await this.assertBelongsToOrganization(
        'department',
        data.departmentId,
        organizationId,
      );
      await this.assertBelongsToOrganization(
        'manager',
        data.managerId,
        organizationId,
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name,
        role: data.role,
        organizationId,
        departmentId: data.departmentId,
        managerId: data.managerId,
        title: data.title,
        level: data.level,
      },
      select: accountSelect,
    });

    this.logger.log(`User ${user.id} created`);
    return user;
  }

  async update(
    id: string,
    data: UserUpdateRequest,
    currentUser: User,
  ): Promise<UserAccountResponse> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.assertManageable(existing.organizationId, currentUser);
    if (data.role) {
      this.assertAssignableRole(data.role, currentUser);
    }

    if (existing.organizationId) {
      await this.assertBelongsToOrganization(
        'department',
        data.departmentId,
        existing.organizationId,
      );
      await this.assertBelongsToOrganization(
        'manager',
        data.managerId,
        existing.organizationId,
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        role: data.role,
        departmentId: data.departmentId,
        managerId: data.managerId,
        title: data.title,
        level: data.level,
      },
      select: accountSelect,
    });
  }

  async deactivate(
    id: string,
    currentUser: User,
  ): Promise<UserAccountResponse> {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.assertManageable(existing.organizationId, currentUser);

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: accountSelect,
    });

    await this.sessionService.deleteAllUserSessions(id);

    return user;
  }

  async reactivate(
    id: string,
    currentUser: User,
  ): Promise<UserAccountResponse> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.assertManageable(existing.organizationId, currentUser);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: accountSelect,
    });
  }

  /**
   * A non-super-admin (i.e. ORG_ADMIN) may only act on users in their own
   * organization. We throw NotFound rather than Forbidden so the endpoint
   * doesn't leak the existence of users in other tenants.
   */
  private assertManageable(
    targetOrganizationId: string | null,
    currentUser: User,
  ) {
    if (currentUser.role === 'SUPER_ADMIN') return;
    if (
      !targetOrganizationId ||
      targetOrganizationId !== currentUser.organizationId
    ) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Only SUPER_ADMIN can create or promote platform-level admins. An
   * ORG_ADMIN managing their org must not be able to escalate privileges.
   */
  private assertAssignableRole(role: string, currentUser: User) {
    if (currentUser.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
      throw new BadRequestException('You cannot assign the Super Admin role');
    }
  }

  private async assertOrganizationExists(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new BadRequestException('Organization not found');
    }
  }

  private async assertBelongsToOrganization(
    label: 'department' | 'manager',
    id: string | null | undefined,
    organizationId: string,
  ) {
    if (!id) return;

    const record =
      label === 'department'
        ? await this.prisma.department.findFirst({
            where: { id, organizationId },
          })
        : await this.prisma.user.findFirst({ where: { id, organizationId } });

    if (!record) {
      throw new BadRequestException(
        `${label === 'department' ? 'Department' : 'Manager'} must belong to the same organization`,
      );
    }
  }
}
