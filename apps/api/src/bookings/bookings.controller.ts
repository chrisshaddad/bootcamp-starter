import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  BookingListResponse,
  BookingResponse,
  BookingCreateRequest,
} from '@repo/contracts';
import { bookingCreateRequestSchema } from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { bookingSchema } from './bookings.swagger';

@ApiTags('bookings')
@ApiCookieAuth('session-cookie')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** List all bookings for a specific session */
  @Get()
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List bookings for a session',
    description: 'Returns all bookings for a given session. ORG_ADMIN only.',
  })
  @ApiQuery({
    name: 'sessionId',
    required: true,
    type: String,
    description: 'Session UUID to list bookings for',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bookings',
    schema: { type: 'array', items: bookingSchema },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findAll(
    @Query('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: User,
  ): Promise<BookingListResponse> {
    return this.bookingsService.findAllBySession(user.gymId!, sessionId);
  }

  /** Register a member to a session */
  @Post()
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a booking',
    description:
      'Registers a member for a session. Rejects if session is full, cancelled, or member is already booked.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'memberId'],
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        memberId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created',
    schema: bookingSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error / Full / Duplicate',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Session or member not found' })
  async create(
    @Body(new ZodValidationPipe(bookingCreateRequestSchema))
    dto: BookingCreateRequest,
    @CurrentUser() user: User,
  ): Promise<BookingResponse> {
    return this.bookingsService.create(user.gymId!, dto);
  }

  /** Cancel a booking */
  @Patch(':id/cancel')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Marks a booking as CANCELLED, freeing the slot.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled',
    schema: bookingSchema,
  })
  @ApiResponse({ status: 400, description: 'Already cancelled' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<BookingResponse> {
    return this.bookingsService.cancel(id, user.gymId!);
  }

  /** Check in a booked member */
  @Patch(':id/check-in')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Check in a booking',
    description: 'Marks a BOOKED booking as CHECKED_IN.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Booking checked in',
    schema: bookingSchema,
  })
  @ApiResponse({ status: 400, description: 'Booking not in BOOKED status' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<BookingResponse> {
    return this.bookingsService.checkIn(id, user.gymId!);
  }
}
