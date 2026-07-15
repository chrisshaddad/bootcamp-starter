import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { Roles, OrganizationId } from '../auth/decorators';
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
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<BookListResponse> {
    return this.booksService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<BookResponse> {
    return this.booksService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(bookCreateRequestSchema))
    body: BookCreateRequest,
  ): Promise<BookResponse> {
    return this.booksService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bookUpdateRequestSchema))
    body: BookUpdateRequest,
  ): Promise<BookResponse> {
    return this.booksService.update(organizationId, id, body);
  }
}
