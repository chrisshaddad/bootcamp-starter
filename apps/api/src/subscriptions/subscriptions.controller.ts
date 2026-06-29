import {
  Body,
  Controller,
  ForbiddenException,
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
import { SubscriptionsService } from './subscriptions.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  SubscriptionListResponse,
  SubscriptionListQuery,
  SubscriptionResponse,
  SubscriptionCreateRequest,
} from '@repo/contracts';
import {
  subscriptionListQuerySchema,
  subscriptionCreateRequestSchema,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';
import { subscriptionSchema } from './subscriptions.swagger';

/** Auto-generated docstring */
@ApiTags('subscriptions')
@ApiCookieAuth('session-cookie')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Auto-generated docstring */
  private assertGymId(user: User): string {
    if (!user.gymId) {
      throw new ForbiddenException('User is not associated with a gym');
    }
    return user.gymId;
  }

  /** List all subscriptions for a member */
  @Get('members/:memberId/subscriptions')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'List subscriptions for a member',
    description:
      "Returns a paginated list of a member's subscription history. ORG_ADMIN only.",
  })
  @ApiParam({
    name: 'memberId',
    type: String,
    description: 'Member UUID',
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
    description: 'Page size (default 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    description: 'Filter by subscription status',
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of the member's subscriptions",
    schema: {
      type: 'object',
      properties: {
        subscriptions: { type: 'array', items: subscriptionSchema },
        total: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findAllByMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(subscriptionListQuerySchema))
    query: SubscriptionListQuery,
  ): Promise<SubscriptionListResponse> {
    return this.subscriptionsService.findAllByMember(
      memberId,
      this.assertGymId(user),
      query,
    );
  }

  /** Create a new subscription for a member */
  @Post('subscriptions')
  @Roles('ORG_ADMIN')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a subscription',
    description:
      'Creates a subscription for a member. Validates plan belongs to the gym and is active. Computes endDate from startDate + plan.durationDays and snapshots the plan price.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['memberId', 'planId'],
      properties: {
        memberId: {
          type: 'string',
          format: 'uuid',
          description: 'Member UUID',
        },
        planId: {
          type: 'string',
          format: 'uuid',
          description:
            "MembershipPlan UUID — must belong to the caller's gym and be active",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created',
    schema: subscriptionSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or inactive plan',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Member or plan not found' })
  async create(
    @Body(new ZodValidationPipe(subscriptionCreateRequestSchema))
    dto: SubscriptionCreateRequest,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.create(this.assertGymId(user), dto);
  }

  /** Cancel an active subscription */
  @Patch('subscriptions/:id/cancel')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Cancel a subscription',
    description:
      'Sets the subscription status to CANCELLED. Returns 400 if already cancelled or expired.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Subscription UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    schema: subscriptionSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Subscription is already cancelled or expired',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.cancel(id, this.assertGymId(user));
  }
}
