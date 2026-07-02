import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type { EmployeeResponse } from '@repo/contracts';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, currentUser: User): Promise<EmployeeResponse> {
    const where =
      currentUser.role === 'SUPER_ADMIN'
        ? { id }
        : { id, organizationId: currentUser.organizationId };

    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

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

    return {
      ...employee,
      skills: employee.userSkills.map(({ skill, proficiencyLevel }) => ({
        ...skill,
        proficiencyLevel,
      })),
    };
  }
}
