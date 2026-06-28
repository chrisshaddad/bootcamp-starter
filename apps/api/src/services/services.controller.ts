import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  serviceCreateRequestSchema,
  serviceUpdateRequestSchema,
  serviceListQuerySchema,
  type ServiceCreateRequest,
  type ServiceUpdateRequest,
  type ServiceListQuery,
  type ServiceListResponse,
  type ServiceResponse,
} from '@repo/contracts';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  private requireOrgId(user: User): string {
    if (!user.organizationId) {
      throw new BadRequestException(
        'This endpoint requires an organization context',
      );
    }
    return user.organizationId;
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(serviceListQuerySchema))
    query: ServiceListQuery,
  ): Promise<ServiceListResponse> {
    return this.servicesService.findAll(this.requireOrgId(user), {
      page: query.page,
      limit: query.limit,
      activeOnly: query.activeOnly,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.findOne(id, this.requireOrgId(user));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(serviceCreateRequestSchema))
    body: ServiceCreateRequest,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.create(this.requireOrgId(user), body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(serviceUpdateRequestSchema))
    body: ServiceUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.update(id, this.requireOrgId(user), body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.servicesService.remove(id, this.requireOrgId(user));
  }
}
