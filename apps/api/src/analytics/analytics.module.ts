import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { ANALYTICS_QUEUE } from './analytics.constants';
import { AnalyticsProcessor } from './analytics.processor';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: ANALYTICS_QUEUE })],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor],
})
export class AnalyticsModule {}
