import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User, OrganizationStatus } from '@repo/db';
import {
  organizationUpdateRequestSchema,
  type OrganizationListResponse,
  type OrganizationDetailResponse,
  type OrganizationActionResponse,
  type OrganizationUpdateRequest,
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
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<OrganizationDetailResponse> {
    // ORG_ADMIN can only access their own organization details
    if (user.role === 'ORG_ADMIN' && user.organizationId !== id) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(organizationUpdateRequestSchema))
    body: OrganizationUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<OrganizationDetailResponse> {
    // ORG_ADMIN can only update their own organization
    if (user.role === 'ORG_ADMIN' && user.organizationId !== id) {
      throw new Error('Unauthorized');
    }
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
}
