import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { OpportunitiesService } from './opportunities.service';
import type { User } from '@repo/db';
import {
  opportunityListQuerySchema,
  opportunityCreateRequestSchema,
  opportunityUpdateRequestSchema,
  type OpportunityListQuery,
  type OpportunityListResponse,
  type OpportunityCreateRequest,
  type OpportunityUpdateRequest,
  type OpportunityResponse,
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

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<OpportunityResponse> {
    return this.opportunitiesService.findOne(id, user);
  }

  @Post()
  @Roles('HR', 'ORG_ADMIN')
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(opportunityCreateRequestSchema))
    body: OpportunityCreateRequest,
  ): Promise<OpportunityResponse> {
    return this.opportunitiesService.create(body, user);
  }

  @Patch(':id')
  @Roles('HR', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(opportunityUpdateRequestSchema))
    body: OpportunityUpdateRequest,
  ): Promise<OpportunityResponse> {
    return this.opportunitiesService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('HR', 'ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.opportunitiesService.delete(id, user);
  }
}
