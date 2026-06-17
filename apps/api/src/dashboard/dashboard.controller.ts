import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  dashboardQuerySchema,
  type DashboardQuery,
  type DashboardResponse,
} from '@repo/contracts';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getMetrics(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
  ): Promise<DashboardResponse> {
    return this.dashboardService.getMetrics(user.organizationId!, query);
  }
}
