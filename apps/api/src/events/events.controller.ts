import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  eventAttendanceUpdateRequestSchema,
  eventListQuerySchema,
  type EventAttendanceUpdateRequest,
  type EventAttendanceUpdateResponse,
  type EventAttendeeListResponse,
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

  @Get(':id/attendees')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async findAttendees(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EventAttendeeListResponse> {
    return this.eventsService.findAttendees(id, user);
  }

  @Patch(':id/attendees/:userId/attendance')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async updateAttendance(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(
      new ZodValidationPipe<EventAttendanceUpdateRequest>(
        eventAttendanceUpdateRequestSchema,
      ),
    )
    body: EventAttendanceUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<EventAttendanceUpdateResponse> {
    return this.eventsService.updateAttendance(id, userId, body, user);
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
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER')
  async register(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EventRegisterResponse> {
    return this.eventsService.register(id, user);
  }
}
