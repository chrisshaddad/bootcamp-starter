import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AuthorsService } from '../catalog/authors.service';
import { Roles, ActiveOrganizationId } from '../auth/decorators';
import type { AuthorListResponse } from '@repo/contracts';

// Read-only, so patrons can populate a catalog filter dropdown - mutations
// stay staff-only on AuthorsController.
@Controller('portal/authors')
@Roles('MEMBER')
export class PortalAuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  async findAll(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AuthorListResponse> {
    return this.authorsService.findAll(
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
