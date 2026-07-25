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
import { Roles, CurrentUser, Public, OrganizationId } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User, OrganizationStatus } from '@repo/db';
import {
  createOrganizationRequestSchema,
  organizationUpdateRequestSchema,
  type CreateOrganizationRequest,
  type OrganizationUpdateRequest,
  type OrganizationListResponse,
  type OrganizationDetailResponse,
  type OrganizationActionResponse,
  type OrganizationRegisterResponse,
  type OrganizationDirectoryResponse,
  type OrganizationSummaryResponse,
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

  // Must be registered before @Get(':id') so "directory" isn't captured as an id param.
  @Public()
  @Get('directory')
  async directory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<OrganizationDirectoryResponse> {
    return this.organizationsService.directory({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // Must be registered before @Get(':id') so "summary" isn't captured as an id param.
  @Get('summary')
  @Roles('SUPER_ADMIN')
  async summary(): Promise<OrganizationSummaryResponse> {
    return this.organizationsService.summary();
  }

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll(
    @Query('status') status?: OrganizationStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<OrganizationListResponse> {
    return this.organizationsService.findAll({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // ORG_ADMIN self-service for their own library. Declared BEFORE `:id` so the
  // literal `current` segment isn't captured by the param route (which is
  // SUPER_ADMIN-only). Target org resolves via @OrganizationId(), so an admin
  // can only read/edit their own.
  @Get('current')
  @Roles('ORG_ADMIN')
  async findCurrent(
    @OrganizationId() organizationId: string,
  ): Promise<OrganizationDetailResponse> {
    return this.organizationsService.findOne(organizationId);
  }

  @Patch('current')
  @Roles('ORG_ADMIN')
  async updateCurrent(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(organizationUpdateRequestSchema))
    body: OrganizationUpdateRequest,
  ): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.updateProfile(
      organizationId,
      body,
    );
    return {
      message: 'Library settings updated successfully',
      organization,
    };
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

  @Patch(':id/deactivate')
  @Roles('SUPER_ADMIN')
  async deactivate(
    @Param('id') id: string,
  ): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.deactivate(id);
    return {
      message: 'Organization deactivated successfully',
      organization,
    };
  }

  @Patch(':id/activate')
  @Roles('SUPER_ADMIN')
  async activate(@Param('id') id: string): Promise<OrganizationActionResponse> {
    const organization = await this.organizationsService.activate(id);
    return {
      message: 'Organization activated successfully',
      organization,
    };
  }
}
