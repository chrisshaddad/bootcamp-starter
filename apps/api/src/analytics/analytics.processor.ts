import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { Job } from 'bullmq';
import { DatabaseService } from '../database/prisma.service';
import { ANALYTICS_JOBS, ANALYTICS_QUEUE } from './analytics.constants';
import type { RecordAnalyticsVisitJobData } from './analytics.types';

@Processor(ANALYTICS_QUEUE)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly database: DatabaseService) {
    super();
  }

  async process(job: Job<RecordAnalyticsVisitJobData>): Promise<void> {
    if (job.name !== ANALYTICS_JOBS.RECORD_VISIT) {
      this.logger.warn(`Unknown analytics job type: ${job.name}`);
      return;
    }

    try {
      await this.database.analyticsVisit.create({
        data: {
          ...job.data,
          occurredAt: new Date(job.data.occurredAt),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }
}
