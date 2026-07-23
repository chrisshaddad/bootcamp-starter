import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from '../catalog/categories.service';
import { Roles, ActiveOrganizationId } from '../auth/decorators';
import type { CategoryListResponse } from '@repo/contracts';

// Read-only, so patrons can populate a catalog filter dropdown - mutations
// stay staff-only on CategoriesController.
@Controller('portal/categories')
@Roles('MEMBER')
export class PortalCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<CategoryListResponse> {
    return this.categoriesService.findAll(
      this.requireActiveOrganization(activeOrganizationId),
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 100,
      },
    );
  }

  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }
}
