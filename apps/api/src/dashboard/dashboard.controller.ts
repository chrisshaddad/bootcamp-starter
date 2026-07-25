import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles, OrganizationId } from '../auth/decorators';
import type { DashboardSummaryResponse } from '@repo/contracts';

@Controller('dashboard')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @OrganizationId() organizationId: string,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary(organizationId);
  }
}
