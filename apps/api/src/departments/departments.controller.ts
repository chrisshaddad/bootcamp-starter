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
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { DepartmentsService } from './departments.service';
import type { User } from '@repo/db';
import {
  departmentCreateRequestSchema,
  departmentUpdateRequestSchema,
  departmentListQuerySchema,
  type DepartmentCreateRequest,
  type DepartmentUpdateRequest,
  type DepartmentListQuery,
  type DepartmentResponse,
  type DepartmentListResponse,
} from '@repo/contracts';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(departmentListQuerySchema))
    query: DepartmentListQuery,
  ): Promise<DepartmentListResponse> {
    return this.departmentsService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<DepartmentResponse> {
    return this.departmentsService.findOne(id, user);
  }

  @Post()
  @Roles('ORG_ADMIN')
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(departmentCreateRequestSchema))
    body: DepartmentCreateRequest,
  ): Promise<DepartmentResponse> {
    return this.departmentsService.create(body, user);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(departmentUpdateRequestSchema))
    body: DepartmentUpdateRequest,
  ): Promise<DepartmentResponse> {
    return this.departmentsService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.departmentsService.delete(id, user);
  }
}
