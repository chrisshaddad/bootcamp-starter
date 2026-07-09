import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { User } from '@repo/db';
import {
  announcementCreateRequestSchema,
  announcementListQuerySchema,
  type AnnouncementCreateRequest,
  type AnnouncementListQuery,
  type AnnouncementListResponse,
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
}
