import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { PublishersService } from './publishers.service';
import { Roles, OrganizationId } from '../auth/decorators';
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
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PublisherListResponse> {
    return this.publishersService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<PublisherResponse> {
    return this.publishersService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(publisherCreateRequestSchema))
    body: PublisherCreateRequest,
  ): Promise<PublisherResponse> {
    return this.publishersService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(publisherUpdateRequestSchema))
    body: PublisherUpdateRequest,
  ): Promise<PublisherResponse> {
    return this.publishersService.update(organizationId, id, body);
  }
}
