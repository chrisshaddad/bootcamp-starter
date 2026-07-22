import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  OVERDUE_QUEUE,
  OVERDUE_JOBS,
  OVERDUE_SWEEP_INTERVAL_MS,
} from './overdue.constants';

@Injectable()
export class OverdueService implements OnModuleInit {
  private readonly logger = new Logger(OverdueService.name);

  constructor(@InjectQueue(OVERDUE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Schedule a single repeatable sweep. A fixed jobId means restarts upsert
    // the same repeatable rather than stacking duplicates.
    await this.queue.add(
      OVERDUE_JOBS.AGE_OVERDUE,
      {},
      {
        repeat: { every: OVERDUE_SWEEP_INTERVAL_MS },
        jobId: OVERDUE_JOBS.AGE_OVERDUE,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.logger.log('Overdue aging sweep scheduled (hourly).');
  }
}
