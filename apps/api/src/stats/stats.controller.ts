import { Controller, Get } from '@nestjs/common';
import type { PlatformStatsResponse } from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { StatsService } from './stats.service';

// Platform-wide KPI counts for the super-admin dashboard. The global AuthGuard
// already requires a valid session; @Roles narrows access to platform admins.
@Controller('stats')
@Roles('SUPER_ADMIN')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('platform')
  platform(): Promise<PlatformStatsResponse> {
    return this.statsService.platform();
  }
}
