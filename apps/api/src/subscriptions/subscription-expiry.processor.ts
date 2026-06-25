import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import {
  SUBSCRIPTION_EXPIRY_QUEUE,
  SUBSCRIPTION_EXPIRY_JOBS,
} from './subscriptions.constants';

@Processor(SUBSCRIPTION_EXPIRY_QUEUE)
export class SubscriptionExpiryProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(SubscriptionExpiryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SUBSCRIPTION_EXPIRY_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  /** Register the repeatable expiry job on startup; removes any stale duplicate first */
  async onModuleInit(): Promise<void> {
    const existing = await this.queue.getRepeatableJobs();
    for (const job of existing) {
      if (job.name === SUBSCRIPTION_EXPIRY_JOBS.EXPIRE_SUBSCRIPTIONS) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    await this.queue.add(
      SUBSCRIPTION_EXPIRY_JOBS.EXPIRE_SUBSCRIPTIONS,
      {},
      {
        repeat: { pattern: '0 1 * * *' }, // daily at 01:00 UTC
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      'Subscription expiry cron job registered (daily at 01:00 UTC)',
    );
  }

  async process(job: Job): Promise<void> {
    if (job.name === SUBSCRIPTION_EXPIRY_JOBS.EXPIRE_SUBSCRIPTIONS) {
      await this.expireSubscriptions();
    }
  }

  /** Mark all ACTIVE subscriptions whose endDate has passed as EXPIRED */
  private async expireSubscriptions(): Promise<void> {
    const now = new Date();
    const { count } = await this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    });
    this.logger.log(`Expired ${count} subscription(s)`);
  }
}
