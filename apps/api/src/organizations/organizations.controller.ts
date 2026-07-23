import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User, OrganizationStatus } from '@repo/db';
import {
  organizationCreateRequestSchema,
  organizationUpdateRequestSchema,
  type OrganizationCreateRequest,
  type OrganizationUpdateRequest,
  type OrganizationListResponse,
  type OrganizationDetailResponse,
  type OrganizationActionResponse,
} from '@repo/contracts';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(
    @Query('status') status?: OrganizationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<OrganizationListResponse> {
    return this.organizationsService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  async findOne(@Param('id') id: string): Promise<OrganizationDetailResponse> {
    return this.organizationsService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(organizationCreateRequestSchema))
    body: OrganizationCreateRequest,
  ): Promise<OrganizationDetailResponse> {
    return this.organizationsService.create(body, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(organizationUpdateRequestSchema))
    body: OrganizationUpdateRequest,
  ): Promise<OrganizationDetailResponse> {
    return this.organizationsService.update(id, body);
  }

  @Patch(':id/approve')
  @Roles('SUPER_ADMIN')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.approve(id, user.id);
    return {
      message: 'Organization approved successfully',
      organization,
    };
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  async reject(@Param('id') id: string): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.reject(id);
    return {
      message: 'Organization rejected successfully',
      organization,
    };
  }

  @Patch(':id/suspend')
  @Roles('SUPER_ADMIN')
  async suspend(@Param('id') id: string): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.suspend(id);
    return {
      message: 'Organization suspended successfully',
      organization,
    };
  }

  @Patch(':id/reactivate')
  @Roles('SUPER_ADMIN')
  async reactivate(
    @Param('id') id: string,
  ): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.reactivate(id);
    return {
      message: 'Organization reactivated successfully',
      organization,
    };
  }
}
