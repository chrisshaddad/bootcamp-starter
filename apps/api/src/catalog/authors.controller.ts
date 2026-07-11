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
import { AuthorsService } from './authors.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
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
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<AuthorListResponse> {
    return this.authorsService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<AuthorResponse> {
    return this.authorsService.findOne(this.requireOrganizationId(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(authorCreateRequestSchema))
    body: AuthorCreateRequest,
  ): Promise<AuthorResponse> {
    return this.authorsService.create(this.requireOrganizationId(user), body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(authorUpdateRequestSchema))
    body: AuthorUpdateRequest,
  ): Promise<AuthorResponse> {
    return this.authorsService.update(
      this.requireOrganizationId(user),
      id,
      body,
    );
  }

  // LIBRARIAN/ORG_ADMIN always have an organizationId (schema invariant), but
  // the User type carries it as nullable — narrow it once here instead of at
  // every call site.
  private requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.organizationId;
  }
}
