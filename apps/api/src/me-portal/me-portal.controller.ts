import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MePortalService } from './me-portal.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
} from '@repo/contracts';
import {
  meProfileSchema,
  meSubscriptionSchema,
  mePlanSchema,
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
}
