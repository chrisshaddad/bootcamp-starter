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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ManagerOrAdminGuard } from '../auth/guards/manager-or-admin.guard';
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
  @UseGuards(ManagerOrAdminGuard)
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(opportunityCreateRequestSchema))
    body: OpportunityCreateRequest,
  ): Promise<OpportunityResponse> {
    return this.opportunitiesService.create(body, user);
  }

  @Patch(':id')
  @UseGuards(ManagerOrAdminGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(opportunityUpdateRequestSchema))
    body: OpportunityUpdateRequest,
  ): Promise<OpportunityResponse> {
    return this.opportunitiesService.update(id, body, user);
  }

  @Delete(':id')
  @UseGuards(ManagerOrAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.opportunitiesService.delete(id, user);
  }
}
