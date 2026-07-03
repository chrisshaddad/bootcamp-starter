import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { SkillGapsService } from './skill-gaps.service';
import type { User } from '@repo/db';
import {
  skillGapQueryRequestSchema,
  type SkillGapQueryRequest,
  type SkillGapResponse,
} from '@repo/contracts';

@Controller('skill-gaps')
export class SkillGapsController {
  constructor(private readonly skillGapsService: SkillGapsService) {}

  @Get()
  async analyze(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(skillGapQueryRequestSchema))
    query: SkillGapQueryRequest,
  ): Promise<SkillGapResponse> {
    return this.skillGapsService.analyze(query, user);
  }
}
