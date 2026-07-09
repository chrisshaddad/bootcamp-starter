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
import { PublishersService } from './publishers.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  publisherCreateRequestSchema,
  publisherUpdateRequestSchema,
  type PublisherCreateRequest,
  type PublisherUpdateRequest,
  type PublisherResponse,
  type PublisherListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('publishers')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PublisherListResponse> {
    return this.publishersService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<PublisherResponse> {
    return this.publishersService.findOne(
      this.requireOrganizationId(user),
      id,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(publisherCreateRequestSchema))
    body: PublisherCreateRequest,
  ): Promise<PublisherResponse> {
    return this.publishersService.create(
      this.requireOrganizationId(user),
      body,
    );
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(publisherUpdateRequestSchema))
    body: PublisherUpdateRequest,
  ): Promise<PublisherResponse> {
    return this.publishersService.update(
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
