import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type {
  OrganizationListResponse,
  OrganizationDetailResponse,
  OrganizationActionResponse,
} from '@repo/contracts';

@ApiTags('organizations')
@ApiCookieAuth('session')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List organizations for super admins' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organization list' })
  @ApiResponse({ status: 403, description: 'Super admin access required' })
  async findAll(
    @Query('status') status?: string,
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
  @ApiOperation({ summary: 'Get one organization by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Organization detail' })
  @ApiResponse({ status: 403, description: 'Super admin access required' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string): Promise<OrganizationDetailResponse> {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve an organization' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Organization approved' })
  @ApiResponse({ status: 403, description: 'Super admin access required' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.approve(id, user.id);
    return {
      message: 'Organization approved successfully',
      organization,
    };
  }

  @Patch(':id/reject')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject an organization' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Organization rejected' })
  @ApiResponse({ status: 403, description: 'Super admin access required' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async reject(@Param('id') id: string): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.reject(id);
    return {
      message: 'Organization rejected successfully',
      organization,
    };
  }
}
