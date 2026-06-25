import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiInsightsService } from './ai-insights.service';
import { AI_INSIGHTS_QUEUE, AI_INSIGHTS_JOBS } from './ai-insights.constants';

interface GenerateInsightJobData {
  organizationId: string;
  type: string;
  periodStart: string;
  periodEnd: string;
}

@Processor(AI_INSIGHTS_QUEUE)
export class AiInsightsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiInsightsProcessor.name);

  constructor(private readonly aiInsightsService: AiInsightsService) {
    super();
  }

  async process(job: Job<GenerateInsightJobData>): Promise<void> {
    this.logger.log(`Processing AI insights job ${job.id}: ${job.name}`);

    switch (job.name) {
      case AI_INSIGHTS_JOBS.GENERATE:
        await this.handleGenerate(job.data);
        break;
      default:
        this.logger.warn(`Unknown AI insights job: ${job.name}`);
    }
  }

  private async handleGenerate(data: GenerateInsightJobData): Promise<void> {
    const { organizationId, type, periodStart, periodEnd } = data;

    await this.aiInsightsService.generate(
      organizationId,
      type,
      periodStart,
      periodEnd,
    );
  }
}
