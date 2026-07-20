import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AssignCourseGradeRequest,
  AssignCourseGradeResponse,
  TeacherActionResponse,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@repo/db';
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
        name: teacher.name ?? teacher.email,
        email: teacher.email,
        role: teacher.role,
        status: teacher.isConfirmed ? 'Active' : 'Pending',
        createdAt: teacher.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  async updateTeacher(
    organizationId: string,
    teacherId: string,
    payload: UpdateTeacherRequest,
  ): Promise<UpdateTeacherResponse> {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'ORG_ADMIN',
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    let updatedTeacher;

    try {
      updatedTeacher = await this.prisma.user.update({
        where: {
          id: teacherId,
        },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.email !== undefined ? { email: payload.email } : {}),
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(`Email conflict while updating teacher ${teacherId}.`);

        throw new ConflictException('A user with this email already exists.');
      }

      throw error;
    }

    this.logger.log(`Updated teacher ${teacherId}.`);

    return {
      id: updatedTeacher.id,
      name: updatedTeacher.name ?? updatedTeacher.email,
      email: updatedTeacher.email,
      role: updatedTeacher.role,
      status: updatedTeacher.isConfirmed ? 'Active' : 'Pending',
      createdAt: updatedTeacher.createdAt.toISOString().slice(0, 10),
    };
  }

  async deleteTeacher(
    organizationId: string,
    teacherId: string,
  ): Promise<TeacherActionResponse> {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'ORG_ADMIN',
        organizationId,
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

  async assignCourseToTeacherAndGrade(
    payload: AssignCourseGradeRequest,
  ): Promise<AssignCourseGradeResponse> {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: payload.teacherId,
        organizationId: payload.organizationId,
        role: 'ORG_ADMIN',
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const grade = await this.prisma.gradeLevel.findUnique({
      where: {
        id: payload.gradeId,
      },
      select: {
        id: true,
        sections: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (grade.sections.length === 0) {
      throw new BadRequestException(
        'This grade does not have any sections. Create at least one section first.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const subject = await tx.subject.upsert({
        where: {
          name: payload.title,
        },
        update: {},
        create: {
          name: payload.title,
        },
        select: {
          id: true,
        },
      });

      const existingCourses = await tx.course.findMany({
        where: {
          teacherId: payload.teacherId,
          subjectId: subject.id,
          organizationId: payload.organizationId,
          sectionId: {
            in: grade.sections.map((section) => section.id),
          },
        },
        select: {
          sectionId: true,
        },
      });

      const existingSectionIds = new Set(
        existingCourses
          .map((course) => course.sectionId)
          .filter((sectionId): sectionId is string => Boolean(sectionId)),
      );

      const sectionsToCreate = grade.sections.filter(
        (section) => !existingSectionIds.has(section.id),
      );

      const createdCourses = await Promise.all(
        sectionsToCreate.map((section) =>
          tx.course.create({
            data: {
              teacherId: payload.teacherId,
              subjectId: subject.id,
              sectionId: section.id,
              organizationId: payload.organizationId,
              title: payload.title,
              description: payload.description || null,
              status: payload.status || 'draft',
            },
            select: {
              id: true,
            },
          }),
        ),
      );

      return createdCourses;
    });

    this.logger.log(
      `Assigned course ${payload.title} to teacher ${payload.teacherId} for grade ${payload.gradeId}.`,
    );

    return {
      teacherId: payload.teacherId,
      gradeId: payload.gradeId,
      title: payload.title,
      createdCourseCount: result.length,
      courseIds: result.map((course) => course.id),
    };
  }
}
