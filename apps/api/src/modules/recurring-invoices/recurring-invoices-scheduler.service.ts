import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  RECURRING_INVOICES_CRON,
  RECURRING_INVOICES_DAILY_JOB_ID,
  RECURRING_INVOICES_QUEUE,
  RECURRING_INVOICES_RUN_JOB,
} from './recurring-invoices.constants';

/**
 * Registers the daily repeatable job on module init (there is no
 * `@nestjs/schedule` in this app — BullMQ's repeatable jobs are the
 * scheduling primitive here, same as the rest of the queue infra). A fixed
 * jobId means BullMQ upserts the same repeatable job definition on every app
 * restart instead of accumulating duplicate schedules.
 */
@Injectable()
export class RecurringInvoicesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RecurringInvoicesSchedulerService.name);

  constructor(
    @InjectQueue(RECURRING_INVOICES_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        RECURRING_INVOICES_RUN_JOB,
        {},
        {
          repeat: { pattern: RECURRING_INVOICES_CRON },
          jobId: RECURRING_INVOICES_DAILY_JOB_ID,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule the daily recurring-invoices job: ${String(error)}`,
      );
    }
  }
}
