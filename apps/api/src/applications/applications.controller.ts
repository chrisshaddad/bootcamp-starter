import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { ApplicationsService } from './applications.service';
import type { User } from '@repo/db';
import {
  applicationCreateRequestSchema,
  applicationUpdateRequestSchema,
  applicationListQuerySchema,
  type ApplicationCreateRequest,
  type ApplicationUpdateRequest,
  type ApplicationListQuery,
  type ApplicationResponse,
  type ApplicationListResponse,
} from '@repo/contracts';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(applicationListQuerySchema))
    query: ApplicationListQuery,
  ): Promise<ApplicationListResponse> {
    return this.applicationsService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.findOne(id, user);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(applicationCreateRequestSchema))
    body: ApplicationCreateRequest,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.create(body, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(applicationUpdateRequestSchema))
    body: ApplicationUpdateRequest,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.applicationsService.delete(id, user);
  }
}
