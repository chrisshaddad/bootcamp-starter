import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  eventAttendanceUpdateRequestSchema,
  eventCreateRequestSchema,
  eventListQuerySchema,
  eventUpdateRequestSchema,
  type EventAttendanceUpdateRequest,
  type EventAttendanceUpdateResponse,
  type EventAttendeeListResponse,
  type EventCreateRequest,
  type EventDetailResponse,
  type EventListQuery,
  type EventListResponse,
  type EventRegisterResponse,
  type EventUpdateRequest,
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

  @Post()
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async create(
    @Body(new ZodValidationPipe<EventCreateRequest>(eventCreateRequestSchema))
    body: EventCreateRequest,
    @CurrentUser() user: User,
  ): Promise<EventDetailResponse> {
    return this.eventsService.create(body, user);
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

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe<EventUpdateRequest>(eventUpdateRequestSchema))
    body: EventUpdateRequest,
    @CurrentUser() user: User,
  ): Promise<EventDetailResponse> {
    return this.eventsService.update(id, body, user);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EventDetailResponse> {
    return this.eventsService.cancel(id, user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.eventsService.remove(id, user);
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
