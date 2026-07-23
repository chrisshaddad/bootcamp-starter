import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
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

  async findAll(query: UserListQuery): Promise<UserListResponse> {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.UserWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.role ? { role: query.role } : {}),
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

  async findOne(id: string): Promise<UserAccountResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: accountSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(data: UserCreateRequest): Promise<UserAccountResponse> {
    const email = data.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    if (data.organizationId) {
      await this.assertOrganizationExists(data.organizationId);
      await this.assertBelongsToOrganization(
        'department',
        data.departmentId,
        data.organizationId,
      );
      await this.assertBelongsToOrganization(
        'manager',
        data.managerId,
        data.organizationId,
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name,
        role: data.role,
        organizationId: data.organizationId,
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
  ): Promise<UserAccountResponse> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
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
    currentUserId: string,
  ): Promise<UserAccountResponse> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: accountSelect,
    });

    await this.sessionService.deleteAllUserSessions(id);

    return user;
  }

  async reactivate(id: string): Promise<UserAccountResponse> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: accountSelect,
    });
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
