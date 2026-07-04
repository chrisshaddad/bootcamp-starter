import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { User } from '@repo/db';
import {
  announcementCreateRequestSchema,
  announcementListQuerySchema,
  announcementUpdateRequestSchema,
  type AnnouncementCreateRequest,
  type AnnouncementListQuery,
  type AnnouncementListResponse,
  type AnnouncementUpdateRequest,
  type Announcement,
} from '@repo/contracts';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async findAll(
    @Query(
      new ZodValidationPipe<AnnouncementListQuery>(announcementListQuerySchema),
    )
    query: AnnouncementListQuery,
    @CurrentUser() user: User,
  ): Promise<AnnouncementListResponse> {
    return this.announcementsService.findAll(query, user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    return this.announcementsService.findOne(id, user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async create(
    @Body(
      new ZodValidationPipe<AnnouncementCreateRequest>(
        announcementCreateRequestSchema,
      ),
    )
    body: AnnouncementCreateRequest,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    return this.announcementsService.create(body, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async update(
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe<AnnouncementUpdateRequest>(
        announcementUpdateRequestSchema,
      ),
    )
    body: AnnouncementUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    return this.announcementsService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Announcement> {
    return this.announcementsService.remove(id, user);
  }
}
