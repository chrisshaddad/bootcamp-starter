import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  StudentOrganizationGradesResponse,
  StudentOrganizationsResponse,
  StudentsByGradeResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StudentsService {
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
          },
        },
        section: {
          select: {
            name: true,
          },
        },
      },
    });

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
        status: 'Active',
      })),
    };
  }
}
