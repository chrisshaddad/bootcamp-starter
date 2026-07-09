import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User, InstitutionStatus } from '@repo/db';
import {
  institutionCreateRequestSchema,
  type InstitutionCreateRequest,
  type InstitutionListResponse,
  type InstitutionDetailResponse,
  type InstitutionActionResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(
    @Query('status') status?: InstitutionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<InstitutionListResponse> {
    return this.institutionsService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  async findOne(@Param('id') id: string): Promise<InstitutionDetailResponse> {
    return this.institutionsService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(
    @Body(new ZodValidationPipe(institutionCreateRequestSchema))
    body: InstitutionCreateRequest,
    @CurrentUser() user: User,
  ): Promise<InstitutionDetailResponse> {
    return this.institutionsService.create(body, user.id);
  }

  @Patch(':id/approve')
  @Roles('SUPER_ADMIN')
  async approve(@Param('id') id: string): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.approve(id);
    return {
      message: 'Institution approved successfully',
      institution,
    };
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  async reject(@Param('id') id: string): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.reject(id);
    return {
      message: 'Institution rejected successfully',
      institution,
    };
  }
}
