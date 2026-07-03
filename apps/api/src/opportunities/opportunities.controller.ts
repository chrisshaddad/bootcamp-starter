import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { OpportunitiesService } from './opportunities.service';
import type { User } from '@repo/db';
import {
  opportunityListQuerySchema,
  type OpportunityListQuery,
  type OpportunityListResponse,
} from '@repo/contracts';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(opportunityListQuerySchema))
    query: OpportunityListQuery,
  ): Promise<OpportunityListResponse> {
    return this.opportunitiesService.findAll(query, user);
  }
}
