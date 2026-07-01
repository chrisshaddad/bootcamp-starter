import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MePortalService } from './me-portal.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { BookingStatus as BookingStatusEnum, type User } from '@repo/db';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
  MeBookingListResponse,
  MeBookingResponse,
  BookingStatus,
} from '@repo/contracts';
import {
  meProfileSchema,
  meSubscriptionSchema,
  mePlanSchema,
  meBookingSchema,
} from './me-portal.swagger';

@ApiTags('me')
@ApiCookieAuth('session-cookie')
@Controller('me')
export class MePortalController {
  constructor(private readonly mePortalService: MePortalService) {}

  @Get('profile')
  @Roles('MEMBER')
  @ApiOperation({
    summary: 'Get my profile',
    description:
      "Returns the logged-in member's profile from their gym record.",
  })
  @ApiResponse({
    status: 200,
    description: 'Member profile',
    schema: meProfileSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member record not found' })
  async getProfile(@CurrentUser() user: User): Promise<MeProfileResponse> {
    return this.mePortalService.getProfile(user.id, user.gymId!);
  }

  @Get('subscriptions')
  @Roles('MEMBER')
  @ApiOperation({
    summary: 'Get my subscriptions',
    description:
      "Returns all of the logged-in member's subscriptions, newest first.",
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription list',
    schema: {
      type: 'object',
      properties: {
        subscriptions: { type: 'array', items: meSubscriptionSchema },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getSubscriptions(
    @CurrentUser() user: User,
  ): Promise<SubscriptionListResponse> {
    return this.mePortalService.getSubscriptions(user.id, user.gymId!);
  }

  @Get('plans')
  @Roles('MEMBER')
  @ApiOperation({
    summary: 'Get available plans',
    description: "Returns the gym's active membership plan catalog.",
  })
  @ApiResponse({
    status: 200,
    description: 'Active plans list',
    schema: {
      type: 'object',
      properties: {
        plans: { type: 'array', items: mePlanSchema },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getPlans(@CurrentUser() user: User): Promise<PlanListResponse> {
    return this.mePortalService.getPlans(user.id, user.gymId!);
  }

  @Get('bookings')
  @Roles('MEMBER')
  @ApiOperation({
    summary: 'Get my bookings',
    description:
      "Returns all of the logged-in member's session bookings, paginated and sorted by session start date.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default 25)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['BOOKED', 'CHECKED_IN', 'CANCELLED'],
    description: 'Filter by booking status',
  })
  @ApiResponse({
    status: 200,
    description: 'Member bookings list',
    schema: {
      type: 'object',
      properties: {
        bookings: { type: 'array', items: meBookingSchema },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getBookings(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number = 25,
    @Query('status', new ParseEnumPipe(BookingStatusEnum, { optional: true }))
    status?: BookingStatus,
  ): Promise<MeBookingListResponse> {
    return this.mePortalService.getBookings(
      user.id,
      user.gymId!,
      page,
      limit,
      status,
    );
  }

  @Patch('bookings/:id/cancel')
  @Roles('MEMBER')
  @ApiOperation({
    summary: 'Cancel my booking',
    description: "Cancels one of the logged-in member's upcoming bookings.",
  })
  @ApiParam({ name: 'id', type: String, description: 'Booking UUID' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    schema: meBookingSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Already cancelled or session has already started',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<MeBookingResponse> {
    return this.mePortalService.cancelBooking(user.id, user.gymId!, id);
  }
}
