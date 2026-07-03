import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type { SkillGapQueryRequest, SkillGapResponse } from '@repo/contracts';

type SkillGapEmployeeRecord = {
  id: string;
  name: string;
  title: string | null;
  level: number | null;
  userSkills: {
    skillId: string;
    proficiencyLevel: number;
  }[];
};

type SkillGapOpportunityRecord = {
  id: string;
  title: string;
  requiredLevel: number | null;
  opportunitySkills: {
    requiredLevel: number;
    skill: {
      id: string;
      name: string;
      category: string;
    };
  }[];
};

type MatchedSkill = SkillGapResponse['matchedSkills'][number];
type MissingSkill = SkillGapResponse['missingSkills'][number];

@Injectable()
export class SkillGapsService {
  private readonly logger = new Logger(SkillGapsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyze(
    query: SkillGapQueryRequest,
    currentUser: User,
  ): Promise<SkillGapResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = currentUser.organizationId;
    const where =
      currentUser.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: organizationId as string };

    const [employeeResult, opportunityResult] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          id: query.employeeId,
          ...where,
        },
        select: {
          id: true,
          name: true,
          title: true,
          level: true,
          userSkills: {
            select: {
              skillId: true,
              proficiencyLevel: true,
            },
          },
        },
      }),
      this.prisma.opportunity.findFirst({
        where: {
          id: query.opportunityId,
          ...where,
        },
        select: {
          id: true,
          title: true,
          requiredLevel: true,
          opportunitySkills: {
            select: {
              requiredLevel: true,
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
      }),
    ]);
    const employee = employeeResult as unknown as SkillGapEmployeeRecord | null;
    const opportunity =
      opportunityResult as unknown as SkillGapOpportunityRecord | null;

    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${query.employeeId} not found`,
      );
    }

    if (!opportunity) {
      throw new NotFoundException(
        `Opportunity with ID ${query.opportunityId} not found`,
      );
    }

    const userSkillLevels = new Map(
      employee.userSkills.map((skill) => [
        skill.skillId,
        skill.proficiencyLevel,
      ]),
    );

    const matchedSkills: MatchedSkill[] = [];
    const missingSkills: MissingSkill[] = [];
    let totalFit = 0;

    for (const requiredSkill of opportunity.opportunitySkills) {
      const proficiencyLevel = userSkillLevels.get(requiredSkill.skill.id);
      const contribution =
        requiredSkill.requiredLevel === 0
          ? 1
          : Math.min((proficiencyLevel ?? 0) / requiredSkill.requiredLevel, 1);
      totalFit += contribution;

      const skillPayload = {
        ...requiredSkill.skill,
        requiredLevel: requiredSkill.requiredLevel,
        proficiencyLevel: proficiencyLevel ?? null,
      };

      if (
        proficiencyLevel !== undefined &&
        proficiencyLevel >= requiredSkill.requiredLevel
      ) {
        matchedSkills.push({
          ...skillPayload,
          proficiencyLevel,
        });
      } else {
        missingSkills.push(skillPayload);
      }
    }

    const fitScore =
      opportunity.opportunitySkills.length === 0
        ? 100
        : Math.round((totalFit / opportunity.opportunitySkills.length) * 100);

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        title: employee.title,
        level: employee.level,
      },
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        requiredLevel: opportunity.requiredLevel,
      },
      fitScore,
      matchedSkills,
      missingSkills,
    };
  }
}
