import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { BookCopiesService } from '../catalog/book-copies.service';
import { Roles, ActiveOrganizationId } from '../auth/decorators';
import {
  bookCopyStatusSchema,
  type BookCopyResponse,
  type BookCopyListResponse,
  type BookCopyStatus,
} from '@repo/contracts';

@Controller('portal/book-copies')
@Roles('MEMBER')
export class PortalBookCopiesController {
  constructor(private readonly bookCopiesService: BookCopiesService) {}

  @Get()
  async findAll(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('bookId') bookId?: string,
    @Query('status') status?: string,
  ): Promise<BookCopyListResponse> {
    return this.bookCopiesService.findAll(
      this.requireActiveOrganization(activeOrganizationId),
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        bookId,
        status: status ? this.parseStatus(status) : undefined,
      },
    );
  }

  @Get(':id')
  async findOne(
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Param('id') id: string,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.findOne(
      this.requireActiveOrganization(activeOrganizationId),
      id,
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

  private parseStatus(status: string): BookCopyStatus {
    const result = bookCopyStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
