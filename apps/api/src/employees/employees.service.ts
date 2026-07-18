import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { User, EmploymentType, WorkArrangement } from '@repo/db';
import type {
  EmployeeResponse,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeSkillsUpdateRequest,
  EmployeeProfileUpdateRequest,
} from '@repo/contracts';

type EmployeeListRecord = {
  id: string;
  email: string;
  name: string;
  title: string | null;
  level: number | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  department: { id: string; name: string } | null;
  manager: { id: string; email: string; name: string } | null;
  profile: {
    bio: string | null;
    careerGoal: string | null;
    phoneNumber: string | null;
    street1: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    employmentType: EmploymentType | null;
    workArrangement: WorkArrangement | null;
    profilePictureUrl: string | null;
  } | null;
  // Only populated when the "mine" filter is set (see findAll below) -
  // omitted from the general directory listing for performance.
  userSkills?: {
    proficiencyLevel: number;
    skill: { id: string; name: string; category: string };
  }[];
};

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, currentUser: User): Promise<EmployeeResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const where =
      currentUser.role === 'SUPER_ADMIN'
        ? { id }
        : { id, organizationId: currentUser.organizationId };

    const employee = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        level: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        profile: {
          select: {
            bio: true,
            careerGoal: true,
            phoneNumber: true,
            street1: true,
            street2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            employmentType: true,
            workArrangement: true,
            profilePictureUrl: true,
          },
        },
        userSkills: {
          select: {
            proficiencyLevel: true,
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: {
            skill: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const { userSkills, ...employeeFields } = employee;

    return {
      ...employeeFields,
      skills: userSkills.map(({ skill, proficiencyLevel }) => ({
        ...skill,
        proficiencyLevel,
      })),
    };
  }

  async findAll(
    query: EmployeeListQuery,
    currentUser: User,
  ): Promise<EmployeeListResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skip = (query.page - 1) * query.limit;
    const where: Prisma.UserWhereInput = {
      ...(currentUser.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: currentUser.organizationId as string }),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.mine ? { managerId: currentUser.id } : {}),
    };

    const baseSelect = {
      id: true,
      email: true,
      name: true,
      title: true,
      level: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      manager: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      profile: {
        select: {
          bio: true,
          careerGoal: true,
          phoneNumber: true,
          street1: true,
          street2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          employmentType: true,
          workArrangement: true,
          profilePictureUrl: true,
        },
      },
    } satisfies Prisma.UserSelect;

    // "mine" scopes to the caller's own (typically small) direct-reports
    // list, so it's safe to eagerly include skills for the team overview -
    // the general directory listing omits them for performance.
    const [employees, total] = await Promise.all([
      query.mine
        ? this.prisma.user.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { name: 'asc' },
            select: {
              ...baseSelect,
              userSkills: {
                select: {
                  proficiencyLevel: true,
                  skill: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
                orderBy: {
                  skill: {
                    name: 'asc',
                  },
                },
              },
            },
          })
        : this.prisma.user.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { name: 'asc' },
            select: baseSelect,
          }),
      this.prisma.user.count({ where }),
    ]);
    const employeeRecords = employees as unknown as EmployeeListRecord[];

    return {
      employees: employeeRecords.map((emp) => {
        const userSkills = emp.userSkills ?? [];

        return {
          id: emp.id,
          email: emp.email,
          name: emp.name,
          title: emp.title,
          level: emp.level,
          organizationId: emp.organizationId,
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          department: emp.department,
          manager: emp.manager,
          profile: emp.profile,
          skills: userSkills.map(({ skill, proficiencyLevel }) => ({
            ...skill,
            proficiencyLevel,
          })),
        };
      }),
      total,
    };
  }

  async updateSkills(
    id: string,
    data: EmployeeSkillsUpdateRequest,
    currentUser: User,
  ): Promise<EmployeeResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Check if user can update this employee's skills
    if (currentUser.role === 'EMPLOYEE' && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own skills');
    }

    // Verify employee exists and belongs to org
    const employee = await this.prisma.user.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (!employee.organizationId) {
      throw new BadRequestException(
        'Cannot update skills for an employee without an organization',
      );
    }

    // Validate all skills belong to user's organization
    if (data.skills.length > 0) {
      const skillIds = data.skills.map((s) => s.skillId);
      const skills = await this.prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          organizationId: employee.organizationId,
        },
      });

      if (skills.length !== skillIds.length) {
        throw new BadRequestException(
          'All skills must belong to the same organization',
        );
      }

      // Validate proficiency levels
      const invalidLevels = data.skills.filter(
        (s) => s.proficiencyLevel < 1 || s.proficiencyLevel > 5,
      );
      if (invalidLevels.length > 0) {
        throw new BadRequestException(
          'Proficiency level must be between 1 and 5',
        );
      }
    }

    // Update skills transactionally
    await this.prisma.$transaction([
      this.prisma.userSkill.deleteMany({
        where: { userId: id },
      }),
      ...(data.skills.length > 0
        ? [
            this.prisma.userSkill.createMany({
              data: data.skills.map((skill) => ({
                userId: id,
                skillId: skill.skillId,
                proficiencyLevel: skill.proficiencyLevel,
              })),
            }),
          ]
        : []),
    ]);

    // Return updated employee with skills
    return this.findOne(id, currentUser);
  }

  async updateProfile(
    id: string,
    data: EmployeeProfileUpdateRequest,
    currentUser: User,
  ): Promise<EmployeeResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Check if user can update this employee's profile
    if (currentUser.role === 'EMPLOYEE' && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Verify employee exists and belongs to org
    const employee = await this.prisma.user.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.prisma.userProfile.upsert({
      where: { userId: id },
      create: { userId: id, ...data },
      update: data,
    });

    return this.findOne(id, currentUser);
  }
}
