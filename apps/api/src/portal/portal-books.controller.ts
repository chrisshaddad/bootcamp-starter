import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { BooksService } from '../catalog/books.service';
import { Roles, ActiveOrganizationId } from '../auth/decorators';
import type { BookResponse, BookListResponse } from '@repo/contracts';

@Controller('portal/books')
@Roles('MEMBER')
export class PortalBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<BookListResponse> {
    return this.booksService.findAll(
      this.requireActiveOrganization(activeOrganizationId),
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
    );
  }

  @Get(':id')
  async findOne(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Param('id') id: string,
  ): Promise<BookResponse> {
    return this.booksService.findOne(
      this.requireActiveOrganization(activeOrganizationId),
      id,
    );
  }

  // Every portal controller resolves org from @ActiveOrganizationId(), not
  // @CurrentUser().organizationId (which is null for MEMBER). A patron who
  // hasn't activated a library yet gets a clear 400, not an unscoped query.
  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }
}
