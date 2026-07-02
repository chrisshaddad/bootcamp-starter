import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type { DashboardStatsResponse } from '@repo/contracts';

const dashboardStatsSchema = {
  type: 'object',
  properties: {
    totalMembers: { type: 'number', example: 42 },
    totalActiveMembers: { type: 'number', example: 38 },
    expiringSoon: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          memberId: { type: 'string', format: 'uuid' },
          memberName: { type: 'string' },
          subscriptionId: { type: 'string', format: 'uuid' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
    },
    currentOccupancy: { type: 'number', example: 5 },
    maxCapacity: { type: 'number', nullable: true, example: 50 },
  },
};

@ApiTags('dashboard')
@ApiCookieAuth('session-cookie')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Get gym dashboard stats',
    description:
      "Returns aggregated stats for the caller's gym: member counts, expiring subscriptions, live occupancy and max capacity.",
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    schema: dashboardStatsSchema,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getStats(@CurrentUser() user: User): Promise<DashboardStatsResponse> {
    return this.dashboardService.getStats(user.gymId!);
  }
}
