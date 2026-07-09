import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentListQuery,
  DepartmentResponse,
  DepartmentListResponse,
} from '@repo/contracts';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: DepartmentCreateRequest,
    currentUser: User,
  ): Promise<DepartmentResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = currentUser.organizationId!;

    // Validate manager belongs to same org if provided
    if (data.managerId) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: data.managerId,
          organizationId,
        },
      });

      if (!manager) {
        throw new BadRequestException(
          'Manager must belong to the same organization',
        );
      }
    }

    // Check for duplicate name within org
    const existing = await this.prisma.department.findFirst({
      where: {
        organizationId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Department "${data.name}" already exists in this organization`,
      );
    }

    const department = await this.prisma.department.create({
      data: {
        ...data,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        manager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return department;
  }

  async findAll(
    query: DepartmentListQuery,
    currentUser: User,
  ): Promise<DepartmentListResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skip = (query.page - 1) * query.limit;
    const where: Prisma.DepartmentWhereInput =
      currentUser.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: currentUser.organizationId as string };

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          organizationId: true,
          manager: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return { departments, total };
  }

  async findOne(id: string, currentUser: User): Promise<DepartmentResponse> {
    const where: Prisma.DepartmentWhereInput =
      currentUser.role === 'SUPER_ADMIN'
        ? { id }
        : { id, organizationId: currentUser.organizationId as string };

    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const department = await this.prisma.department.findFirst({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        manager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(
    id: string,
    data: DepartmentUpdateRequest,
    currentUser: User,
  ): Promise<DepartmentResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify department exists and belongs to user's org
    const existing = await this.prisma.department.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
    });

    if (!existing) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Validate manager if being changed
    if (data.managerId !== undefined && data.managerId !== null) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: data.managerId,
          organizationId: existing.organizationId,
        },
      });

      if (!manager) {
        throw new BadRequestException(
          'Manager must belong to the same organization',
        );
      }
    }

    // Check for duplicate if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.department.findFirst({
        where: {
          organizationId: existing.organizationId,
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Department "${data.name}" already exists in this organization`,
        );
      }
    }

    const department = await this.prisma.department.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        manager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return department;
  }

  async delete(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify department exists and belongs to user's org
    const existing = await this.prisma.department.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
      select: {
        id: true,
        _count: {
          select: {
            users: true,
            opportunities: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Check if department has employees or opportunities
    if (existing._count.users > 0 || existing._count.opportunities > 0) {
      throw new BadRequestException(
        `Cannot delete department. It has ${existing._count.users} employee(s) and ${existing._count.opportunities} opportunity/opportunities`,
      );
    }

    await this.prisma.department.delete({ where: { id } });
  }
}
