import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Roles, CurrentUser, Public } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User, OrganizationStatus } from '@repo/db';
import {
  createOrganizationRequestSchema,
  type CreateOrganizationRequest,
  type OrganizationListResponse,
  type OrganizationDetailResponse,
  type OrganizationActionResponse,
  type OrganizationRegisterResponse,
} from '@repo/contracts';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(createOrganizationRequestSchema))
    body: CreateOrganizationRequest,
  ): Promise<OrganizationRegisterResponse> {
    return this.organizationsService.register(body);
  }

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
