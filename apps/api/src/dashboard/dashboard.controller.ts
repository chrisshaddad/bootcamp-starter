import { Controller, Get } from '@nestjs/common';
import type { User } from '@repo/db';
import type {
  SuperAdminDashboardResponse,
  TeacherDashboardResponse,
} from '@repo/contracts';

import { CurrentUser, Roles } from '../auth/decorators';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('super-admin')
  @Roles('SUPER_ADMIN')
  async getSuperAdminDashboard(): Promise<SuperAdminDashboardResponse> {
    return this.dashboardService.getSuperAdminDashboard();
  }

  @Get('teacher')
  @Roles('ORG_ADMIN')
  async getTeacherDashboard(
    @CurrentUser() user: User,
  ): Promise<TeacherDashboardResponse> {
    return this.dashboardService.getTeacherDashboard(
      user.id,
      user.organizationId,
    );
  }
}
