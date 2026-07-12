import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  reportQuerySchema,
  reportRangeQuerySchema,
  type ReportQuery,
  type ReportRangeQuery,
  type MonthlyReportResponse,
} from '@repo/contracts';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  async getMonthly(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: ReportQuery,
  ): Promise<MonthlyReportResponse> {
    return this.reportsService.getMonthlyReport(user.organizationId!, query);
  }

  @Get('range')
  async getRange(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(reportRangeQuerySchema))
    query: ReportRangeQuery,
  ): Promise<MonthlyReportResponse> {
    return this.reportsService.getRangeReport(user.organizationId!, query);
  }
}
