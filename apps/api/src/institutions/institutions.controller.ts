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
  institutionAdminEmailUpdateRequestSchema,
  institutionAdminCreateRequestSchema,
  type InstitutionCreateRequest,
  type InstitutionListQuery,
  type InstitutionUpdateRequest,
  type InstitutionAdminEmailUpdateRequest,
  type InstitutionAdminCreateRequest,
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
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL', 'PATIENT')
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
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.approve(
      id,
      user.fullName,
    );
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

  @Patch(':id/suspend')
  @Roles('SUPER_ADMIN')
  async suspend(@Param('id') id: string): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.suspend(id);
    return {
      message: 'Institution suspended successfully',
      institution,
    };
  }

  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN')
  async reactivate(
    @Param('id') id: string,
  ): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.reactivate(id);
    return {
      message: 'Institution reactivated successfully',
      institution,
    };
  }

  @Post(':id/admins')
  @Roles('SUPER_ADMIN')
  async addAdmin(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(institutionAdminCreateRequestSchema))
    body: InstitutionAdminCreateRequest,
    @CurrentUser() user: User,
  ): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.addAdmin(
      id,
      body,
      user.id,
      user.fullName,
    );
    return {
      message: 'Admin added and an invitation was sent',
      institution,
    };
  }

  @Patch(':id/admins/:adminId/email')
  @Roles('SUPER_ADMIN')
  async updateAdminEmail(
    @Param('id') id: string,
    @Param('adminId') adminId: string,
    @Body(new ZodValidationPipe(institutionAdminEmailUpdateRequestSchema))
    body: InstitutionAdminEmailUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<InstitutionActionResponse> {
    const institution = await this.institutionsService.updateAdminEmail(
      id,
      adminId,
      body.email,
      user.fullName,
    );
    return {
      message: 'Admin email updated and a new invitation was sent',
      institution,
    };
  }
}
