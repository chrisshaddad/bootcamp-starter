import { Controller, Get } from '@nestjs/common';
import type { SuperAdminDashboardResponse } from '@repo/contracts';

import { Roles } from '../auth/decorators';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('super-admin')
  @Roles('SUPER_ADMIN')
  async getSuperAdminDashboard(): Promise<SuperAdminDashboardResponse> {
    return this.dashboardService.getSuperAdminDashboard();
  }
}
