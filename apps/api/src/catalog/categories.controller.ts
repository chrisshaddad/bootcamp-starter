import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
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
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CategoryListResponse> {
    return this.categoriesService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<CategoryResponse> {
    return this.categoriesService.findOne(this.requireOrganizationId(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(categoryCreateRequestSchema))
    body: CategoryCreateRequest,
  ): Promise<CategoryResponse> {
    return this.categoriesService.create(
      this.requireOrganizationId(user),
      body,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryUpdateRequestSchema))
    body: CategoryUpdateRequest,
  ): Promise<CategoryResponse> {
    return this.categoriesService.update(
      this.requireOrganizationId(user),
      id,
      body,
    );
  }

  private requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.organizationId;
  }
}
