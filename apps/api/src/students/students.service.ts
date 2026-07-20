import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  StudentActionResponse,
  StudentOrganizationGradesResponse,
  StudentOrganizationsResponse,
  StudentsByGradeResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@repo/contracts';

import { PrismaService } from '../database/prisma.service';

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrganizations(): Promise<StudentOrganizationsResponse> {
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

    const studentCounts = await this.prisma.user.groupBy({
      by: ['organizationId'],
      where: {
        role: 'MEMBER',
        isConfirmed: true,
        organizationId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    });

    const studentCountByOrganizationId = new Map(
      studentCounts.map((count) => [count.organizationId, count._count._all]),
    );

    this.logger.log('Fetched student organization dashboard cards.');

    return {
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        studentCount: studentCountByOrganizationId.get(organization.id) ?? 0,
      })),
    };
  }

  async findGradesByOrganization(
    organizationId: string,
  ): Promise<StudentOrganizationGradesResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const studentProfiles = await this.prisma.studentProfile.findMany({
      where: {
        sectionId: {
          not: null,
        },
        user: {
          organizationId,
          role: 'MEMBER',
          isConfirmed: true,
        },
      },
      select: {
        id: true,
        section: {
          select: {
            id: true,
            gradeLevel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const gradeMap = new Map<
      string,
      {
        id: string;
        name: string;
        sectionIds: Set<string>;
        studentCount: number;
      }
    >();

    for (const profile of studentProfiles) {
      if (!profile.section) {
        continue;
      }

      const grade = profile.section.gradeLevel;
      const existingGrade = gradeMap.get(grade.id);

      if (existingGrade) {
        existingGrade.sectionIds.add(profile.section.id);
        existingGrade.studentCount += 1;
      } else {
        gradeMap.set(grade.id, {
          id: grade.id,
          name: grade.name,
          sectionIds: new Set([profile.section.id]),
          studentCount: 1,
        });
      }
    }

    this.logger.log(
      `Fetched student grades for organization ${organizationId}.`,
    );

    return {
      organizationId,
      grades: Array.from(gradeMap.values()).map((grade) => ({
        id: grade.id,
        name: grade.name,
        sectionCount: grade.sectionIds.size,
        studentCount: grade.studentCount,
      })),
    };
  }

  async findStudentsByOrganizationAndGrade(
    organizationId: string,
    gradeId: string,
  ): Promise<StudentsByGradeResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: {
        id: gradeId,
      },
      select: {
        id: true,
      },
    });

    if (!gradeLevel) {
      throw new NotFoundException('Grade not found');
    }

    const studentProfiles = await this.prisma.studentProfile.findMany({
      where: {
        user: {
          organizationId,
          role: 'MEMBER',
        },
        section: {
          is: {
            gradeLevelId: gradeId,
          },
        },
      },
      orderBy: {
        studentCode: 'asc',
      },
      select: {
        id: true,
        studentCode: true,
        dateOfBirth: true,
        user: {
          select: {
            name: true,
            email: true,
            isConfirmed: true,
          },
        },
        section: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Fetched ${studentProfiles.length} students for organization ${organizationId} and grade ${gradeId}.`,
    );

    return {
      organizationId,
      gradeId,
      students: studentProfiles.map((studentProfile) => ({
        id: studentProfile.id,
        studentCode: studentProfile.studentCode,
        name: studentProfile.user.name,
        email: studentProfile.user.email,
        sectionName: studentProfile.section?.name ?? null,
        dateOfBirth: studentProfile.dateOfBirth
          ? studentProfile.dateOfBirth.toISOString().slice(0, 10)
          : null,
        status: studentProfile.user.isConfirmed ? 'Active' : 'Pending',
      })),
    };
  }

  async updateStudent(
    organizationId: string,
    studentProfileId: string,
    payload: UpdateStudentRequest,
  ): Promise<UpdateStudentResponse> {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        user: {
          organizationId,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const userData: {
          name?: string;
          email?: string;
        } = {};

        if (payload.name !== undefined) {
          userData.name = payload.name;
        }

        if (payload.email !== undefined) {
          userData.email = payload.email;
        }

        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: {
              id: studentProfile.userId,
            },
            data: userData,
          });
        }

        const studentProfileData: {
          studentCode?: string;
          dateOfBirth?: Date | null;
        } = {};

        if (payload.studentCode !== undefined) {
          studentProfileData.studentCode = payload.studentCode;
        }

        if (payload.dateOfBirth !== undefined) {
          studentProfileData.dateOfBirth = payload.dateOfBirth
            ? new Date(payload.dateOfBirth)
            : null;
        }

        if (Object.keys(studentProfileData).length > 0) {
          await tx.studentProfile.update({
            where: {
              id: studentProfileId,
            },
            data: studentProfileData,
          });
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        this.logger.warn(
          `Unique-field conflict while updating student ${studentProfileId}.`,
        );

        throw new ConflictException(
          'A user with this email or student code already exists.',
        );
      }

      throw error;
    }

    const updatedStudentProfile = await this.prisma.studentProfile.findUnique({
      where: {
        id: studentProfileId,
      },
      select: {
        id: true,
        studentCode: true,
        dateOfBirth: true,
        section: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            isConfirmed: true,
          },
        },
      },
    });

    if (!updatedStudentProfile) {
      throw new NotFoundException('Student not found');
    }

    this.logger.log(`Updated student ${studentProfileId}.`);

    return {
      id: updatedStudentProfile.id,
      studentCode: updatedStudentProfile.studentCode,
      name: updatedStudentProfile.user.name ?? updatedStudentProfile.user.email,
      email: updatedStudentProfile.user.email,
      sectionName: updatedStudentProfile.section?.name ?? null,
      dateOfBirth: updatedStudentProfile.dateOfBirth
        ? updatedStudentProfile.dateOfBirth.toISOString().slice(0, 10)
        : null,
      status: updatedStudentProfile.user.isConfirmed ? 'Active' : 'Pending',
    };
  }

  async deleteStudent(
    organizationId: string,
    studentProfileId: string,
  ): Promise<StudentActionResponse> {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentProfileId,
        user: {
          organizationId,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.user.delete({
      where: {
        id: studentProfile.userId,
      },
    });

    this.logger.log(`Deleted student ${studentProfileId}.`);

    return {
      id: studentProfileId,
    };
  }
}
