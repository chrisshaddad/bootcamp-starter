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
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  serviceCreateRequestSchema,
  serviceUpdateRequestSchema,
  type ServiceCreateRequest,
  type ServiceUpdateRequest,
  type ServiceListResponse,
  type ServiceResponse,
} from '@repo/contracts';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ServiceListResponse> {
    return this.servicesService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.findOne(id, user.organizationId!);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(serviceCreateRequestSchema))
    body: ServiceCreateRequest,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.create(user.organizationId!, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(serviceUpdateRequestSchema))
    body: ServiceUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<ServiceResponse> {
    return this.servicesService.update(id, user.organizationId!, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.servicesService.remove(id, user.organizationId!);
  }
}
