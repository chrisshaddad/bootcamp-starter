import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  institutionCreateRequestSchema,
  institutionListQuerySchema,
  institutionUpdateRequestSchema,
  type InstitutionCreateRequest,
  type InstitutionListQuery,
  type InstitutionUpdateRequest,
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
    @Query(new ZodValidationPipe(institutionListQuerySchema))
    query: InstitutionListQuery,
  ): Promise<InstitutionListResponse> {
    return this.institutionsService.findAll(query);
  }

  // The caller's own institution. Declared before :id so "me" isn't captured
  // as an institution id.
  @Get('me')
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL')
  async findMine(
    @CurrentUser() user: User,
  ): Promise<InstitutionDetailResponse> {
    return this.institutionsService.findMine(user.institutionId);
  }

  @Patch('me')
  @Roles('INSTITUTION_ADMIN')
  async updateMine(
    @Body(new ZodValidationPipe(institutionUpdateRequestSchema))
    body: InstitutionUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<InstitutionDetailResponse> {
    return this.institutionsService.updateMine(user.institutionId, body);
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
