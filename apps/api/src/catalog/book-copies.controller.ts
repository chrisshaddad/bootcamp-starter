import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookCopiesService } from './book-copies.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
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
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('bookId') bookId?: string,
    @Query('status') status?: string,
  ): Promise<BookCopyListResponse> {
    return this.bookCopiesService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      bookId,
      status: status ? this.parseStatus(status) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.findOne(this.requireOrganizationId(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(bookCopyCreateRequestSchema))
    body: BookCopyCreateRequest,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.create(
      this.requireOrganizationId(user),
      body,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookCopyUpdateRequestSchema))
    body: BookCopyUpdateRequest,
  ): Promise<BookCopyResponse> {
    return this.bookCopiesService.update(
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

  private parseStatus(status: string): BookCopyStatus {
    const result = bookCopyStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
