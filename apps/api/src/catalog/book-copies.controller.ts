import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { BookCopiesService } from './book-copies.service';
import { Roles, OrganizationId } from '../auth/decorators';
import {
  bookCopyCreateRequestSchema,
  bookCopyUpdateRequestSchema,
  bookCopyStatusSchema,
  type BookCopyCreateRequest,
  type BookCopyUpdateRequest,
  type BookCopyResponse,
  type BookCopyListResponse,
  type BookCopyStatus,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('book-copies')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class BookCopiesController {
  constructor(private readonly bookCopiesService: BookCopiesService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('bookId') bookId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<BookCopyListResponse> {
    return this.bookCopiesService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      bookId,
      status: status ? this.parseStatus(status) : undefined,
      search,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(bookCopyCreateRequestSchema))
    body: BookCopyCreateRequest,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookCopyUpdateRequestSchema))
    body: BookCopyUpdateRequest,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.update(organizationId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.bookCopiesService.remove(organizationId, id);
  }

  private parseStatus(status: string): BookCopyStatus {
    const result = bookCopyStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
