import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  APARTMENT_STATUS_SWEEP_CRON,
  APARTMENT_STATUS_SWEEP_DAILY_JOB_ID,
  APARTMENT_STATUS_SWEEP_QUEUE,
  APARTMENT_STATUS_SWEEP_RUN_JOB,
} from './apartment-status-sweep.constants';

/**
 * Registers the daily repeatable job on module init (there is no
 * `@nestjs/schedule` in this app — BullMQ's repeatable jobs are the
 * scheduling primitive here, same as the rest of the queue infra). A fixed
 * jobId means BullMQ upserts the same repeatable job definition on every app
 * restart instead of accumulating duplicate schedules.
 */
@Injectable()
export class ApartmentStatusSweepSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(
    ApartmentStatusSweepSchedulerService.name,
  );

  constructor(
    @InjectQueue(APARTMENT_STATUS_SWEEP_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        APARTMENT_STATUS_SWEEP_RUN_JOB,
        {},
        {
          repeat: { pattern: APARTMENT_STATUS_SWEEP_CRON },
          jobId: APARTMENT_STATUS_SWEEP_DAILY_JOB_ID,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule the daily apartment-status sweep job: ${String(error)}`,
      );
    }
  }
}
