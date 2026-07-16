import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
} from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { Roles, OrganizationId } from '../auth/decorators';
import {
  authorCreateRequestSchema,
  authorUpdateRequestSchema,
  type AuthorCreateRequest,
  type AuthorUpdateRequest,
  type AuthorResponse,
  type AuthorListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('authors')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<AuthorListResponse> {
    return this.authorsService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AuthorResponse> {
    return this.authorsService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(authorCreateRequestSchema))
    body: AuthorCreateRequest,
  ): Promise<AuthorResponse> {
    return this.authorsService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(authorUpdateRequestSchema))
    body: AuthorUpdateRequest,
  ): Promise<AuthorResponse> {
    return this.authorsService.update(organizationId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.authorsService.remove(organizationId, id);
  }
}
