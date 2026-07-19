import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type { DashboardStatsResponse } from '@repo/contracts';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @Roles('INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL')
  async getDashboardStats(
    @CurrentUser() user: User,
  ): Promise<DashboardStatsResponse> {
    return this.statsService.getDashboardStats(user);
  }
}
