import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  ApplicationCreateRequest,
  ApplicationStatus,
  ApplicationResponse,
} from '@repo/contracts';
import type { ApplicationStatus as DatabaseApplicationStatus } from '@repo/db';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    body: ApplicationCreateRequest,
    currentUser: User,
  ): Promise<ApplicationResponse> {
    if (!currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: body.opportunityId,
        organizationId: currentUser.organizationId,
      },
      select: {
        id: true,
        status: true,
        opportunitySkills: {
          select: {
            requiredLevel: true,
            skillId: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException(
        `Opportunity with ID ${body.opportunityId} not found`,
      );
    }

    if (opportunity.status !== 'OPEN') {
      throw new BadRequestException(
        'Opportunity is not accepting applications',
      );
    }

    const existingApplication = await this.prisma.application.findFirst({
      where: {
        userId: currentUser.id,
        opportunityId: opportunity.id,
      },
      select: {
        id: true,
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You have already applied to this opportunity',
      );
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: {
        userId: currentUser.id,
      },
      select: {
        skillId: true,
        proficiencyLevel: true,
      },
    });

    const application = await this.prisma.application.create({
      data: {
        userId: currentUser.id,
        opportunityId: opportunity.id,
        coverNote: body.coverNote,
        status: 'PENDING',
        fitScore: this.calculateFitScore(
          opportunity.opportunitySkills,
          userSkills,
        ),
      },
      select: {
        id: true,
        userId: true,
        opportunityId: true,
        status: true,
        fitScore: true,
        coverNote: true,
        managerApproved: true,
        createdAt: true,
        updatedAt: true,
        opportunity: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    return {
      ...application,
      status: this.toPublicStatus(application.status),
    };
  }

  private toPublicStatus(status: DatabaseApplicationStatus): ApplicationStatus {
    switch (status) {
      case 'ACCEPTED':
      case 'REJECTED':
      case 'WITHDRAWN':
        return status;
      default:
        return 'PENDING';
    }
  }

  private calculateFitScore(
    requiredSkills: { skillId: string; requiredLevel: number }[],
    userSkills: { skillId: string; proficiencyLevel: number }[],
  ): number {
    if (requiredSkills.length === 0) {
      return 100;
    }

    const userSkillLevels = new Map(
      userSkills.map((skill) => [skill.skillId, skill.proficiencyLevel]),
    );

    const total = requiredSkills.reduce((sum, requiredSkill) => {
      const proficiencyLevel = userSkillLevels.get(requiredSkill.skillId) ?? 0;
      return sum + Math.min(proficiencyLevel / requiredSkill.requiredLevel, 1);
    }, 0);

    return Math.round((total / requiredSkills.length) * 100);
  }
}
