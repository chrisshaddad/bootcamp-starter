import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  eventListQuerySchema,
  type EventDetailResponse,
  type EventListQuery,
  type EventListResponse,
  type EventRegisterResponse,
} from '@repo/contracts';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async findAll(
    @Query(new ZodValidationPipe<EventListQuery>(eventListQuerySchema))
    query: EventListQuery,
    @CurrentUser() user: User,
  ): Promise<EventListResponse> {
    return this.eventsService.findAll(query, user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EventDetailResponse> {
    return this.eventsService.findOne(id, user);
  }

  @Post(':id/register')
  @Roles('MEMBER')
  async register(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EventRegisterResponse> {
    return this.eventsService.register(id, user);
  }
}
