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
  SkillCreateRequest,
  SkillUpdateRequest,
  SkillListQuery,
  SkillResponse,
  SkillListResponse,
} from '@repo/contracts';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: SkillCreateRequest,
    currentUser: User,
  ): Promise<SkillResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId =
      currentUser.role === 'SUPER_ADMIN'
        ? currentUser.organizationId!
        : currentUser.organizationId!;

    // Check for duplicate name+category within org
    const existing = await this.prisma.skill.findFirst({
      where: {
        organizationId,
        name: data.name,
        category: data.category,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Skill "${data.name}" in category "${data.category}" already exists`,
      );
    }

    const skill = await this.prisma.skill.create({
      data: {
        ...data,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        category: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return skill;
  }

  async findAll(
    query: SkillListQuery,
    currentUser: User,
  ): Promise<SkillListResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skip = (query.page - 1) * query.limit;
    const where: Prisma.SkillWhereInput = {
      ...(currentUser.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: currentUser.organizationId as string }),
      ...(query.category ? { category: query.category } : {}),
    };

    const [skills, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          category: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.skill.count({ where }),
    ]);

    return { skills, total };
  }

  async findOne(id: string, currentUser: User): Promise<SkillResponse> {
    const where: Prisma.SkillWhereInput =
      currentUser.role === 'SUPER_ADMIN'
        ? { id }
        : { id, organizationId: currentUser.organizationId as string };

    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skill = await this.prisma.skill.findFirst({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    return skill;
  }

  async update(
    id: string,
    data: SkillUpdateRequest,
    currentUser: User,
  ): Promise<SkillResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify skill exists and belongs to user's org
    const existing = await this.prisma.skill.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
    });

    if (!existing) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    // Check for duplicate if name or category is being changed
    if (data.name || data.category) {
      const duplicate = await this.prisma.skill.findFirst({
        where: {
          organizationId: existing.organizationId,
          name: data.name ?? existing.name,
          category: data.category ?? existing.category,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Skill "${data.name ?? existing.name}" in category "${data.category ?? existing.category}" already exists`,
        );
      }
    }

    const skill = await this.prisma.skill.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        category: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return skill;
  }

  async delete(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify skill exists and belongs to user's org
    const existing = await this.prisma.skill.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
      select: {
        id: true,
        _count: {
          select: {
            userSkills: true,
            opportunitySkills: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    // Check if skill is referenced
    const totalReferences =
      existing._count.userSkills + existing._count.opportunitySkills;
    if (totalReferences > 0) {
      throw new BadRequestException(
        `Cannot delete skill. It is referenced by ${existing._count.userSkills} user(s) and ${existing._count.opportunitySkills} opportunity/opportunities`,
      );
    }

    await this.prisma.skill.delete({ where: { id } });
  }
}
