import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  EmployeeResponse,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeSkillsUpdateRequest,
  EmployeeProfileUpdateRequest,
} from '@repo/contracts';

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
            city: true,
            state: true,
            country: true,
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
    };

    const [employees, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { name: 'asc' },
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
              city: true,
              state: true,
              country: true,
              profilePictureUrl: true,
            },
          },
          // Note: NOT including full skills for performance
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      employees: employees.map((emp) => ({
        ...emp,
        skills: [], // Empty skills array for list view
      })),
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
