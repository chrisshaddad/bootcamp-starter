import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  TeacherActionResponse,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrganizations(): Promise<TeacherOrganizationsResponse> {
    const organizations = await this.prisma.organization.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const teacherCounts = await this.prisma.user.groupBy({
      by: ['organizationId'],
      where: {
        role: 'ORG_ADMIN',
        organizationId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    });

    const teacherCountByOrganizationId = new Map(
      teacherCounts.map((count) => [count.organizationId, count._count._all]),
    );

    this.logger.log('Fetched teacher organization dashboard cards.');

    return {
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        teacherCount: teacherCountByOrganizationId.get(organization.id) ?? 0,
      })),
    };
  }

  async findTeachersByOrganization(
    organizationId: string,
  ): Promise<TeachersByOrganizationResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      this.logger.warn(`Organization not found: ${organizationId}`);
      throw new NotFoundException('Organization not found');
    }

    const teachers = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: 'ORG_ADMIN',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isConfirmed: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `Fetched ${teachers.length} teachers for organization ${organizationId}.`,
    );

    return {
      organizationId,
      teachers: teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        status: teacher.isConfirmed ? 'Active' : 'Pending',
        createdAt: teacher.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  async updateTeacher(
    teacherId: string,
    payload: UpdateTeacherRequest,
  ): Promise<TeacherActionResponse> {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'ORG_ADMIN',
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    await this.prisma.user.update({
      where: {
        id: teacherId,
      },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
      },
    });

    this.logger.log(`Updated teacher ${teacherId}.`);

    return {
      id: teacherId,
    };
  }

  async deleteTeacher(teacherId: string): Promise<TeacherActionResponse> {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'ORG_ADMIN',
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    await this.prisma.user.delete({
      where: {
        id: teacherId,
      },
    });

    this.logger.log(`Deleted teacher ${teacherId}.`);

    return {
      id: teacherId,
    };
  }
}
