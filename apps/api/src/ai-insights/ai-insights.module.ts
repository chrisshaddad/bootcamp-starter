import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsService } from './ai-insights.service';
import { AiInsightsProcessor } from './ai-insights.processor';
import { GeminiService } from './gemini.service';
import { DatabaseModule } from '../database/database.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AI_INSIGHTS_QUEUE } from './ai-insights.constants';

@Module({
  imports: [
    DatabaseModule,
    DashboardModule,
    BullModule.registerQueue({ name: AI_INSIGHTS_QUEUE }),
  ],
  controllers: [AiInsightsController],
  providers: [AiInsightsService, AiInsightsProcessor, GeminiService],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}
