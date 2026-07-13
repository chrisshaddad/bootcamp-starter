import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DatabaseModule } from '../database/database.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DatabaseModule, DashboardModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
