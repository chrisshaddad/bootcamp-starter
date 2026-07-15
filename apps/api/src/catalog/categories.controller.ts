import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Roles, OrganizationId } from '../auth/decorators';
import {
  categoryCreateRequestSchema,
  categoryUpdateRequestSchema,
  type CategoryCreateRequest,
  type CategoryUpdateRequest,
  type CategoryResponse,
  type CategoryListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('categories')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CategoryListResponse> {
    return this.categoriesService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<CategoryResponse> {
    return this.categoriesService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(categoryCreateRequestSchema))
    body: CategoryCreateRequest,
  ): Promise<CategoryResponse> {
    return this.categoriesService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryUpdateRequestSchema))
    body: CategoryUpdateRequest,
  ): Promise<CategoryResponse> {
    return this.categoriesService.update(organizationId, id, body);
  }
}
