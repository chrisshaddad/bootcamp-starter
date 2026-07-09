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
import { BooksService } from './books.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  bookCreateRequestSchema,
  bookUpdateRequestSchema,
  type BookCreateRequest,
  type BookUpdateRequest,
  type BookResponse,
  type BookListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('books')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<BookListResponse> {
    return this.booksService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<BookResponse> {
    return this.booksService.findOne(this.requireOrganizationId(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(bookCreateRequestSchema))
    body: BookCreateRequest,
  ): Promise<BookResponse> {
    return this.booksService.create(this.requireOrganizationId(user), body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookUpdateRequestSchema))
    body: BookUpdateRequest,
  ): Promise<BookResponse> {
    return this.booksService.update(
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
