import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { buildRedisConnection, DEFAULT_REDIS_URL } from '@/config/redis.config';
import {
  DEAD_LETTER_JOB,
  DeadLetterJobData,
  NOTIFICATIONS_DEAD_LETTER_QUEUE,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';

/**
 * Dead-letter / alert path for the notifications queue.
 *
 * Subscribes to queue-level `failed` events (via a dedicated {@link QueueEvents}
 * connection — the recommended pattern, since QueueEvents uses blocking Redis
 * commands). Every failure is logged; a job that has exhausted all its retry
 * attempts is additionally copied onto the dead-letter queue so ops can inspect
 * or replay it, rather than it silently disappearing after `removeOnFail`.
 *
 * Entirely additive and best-effort: it observes the existing queue and never
 * changes the enqueue/persist contract, and it never throws from the event
 * handler (a bad Redis moment must not crash the app).
 */
@Injectable()
export class NotificationsDeadLetterService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationsDeadLetterService.name);
  private queueEvents?: QueueEvents;

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    @InjectQueue(NOTIFICATIONS_DEAD_LETTER_QUEUE)
    private readonly deadLetter: Queue,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('redis.url') ?? DEFAULT_REDIS_URL;
    this.queueEvents = new QueueEvents(NOTIFICATIONS_QUEUE, {
      connection: buildRedisConnection(url),
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      void this.handleFailed(jobId, failedReason);
    });

    // Surface (but never rethrow) the listener's own connection errors so a
    // Redis outage is visible in logs without taking the process down.
    this.queueEvents.on('error', (error) => {
      this.logger.error(
        `notifications QueueEvents connection error: ${String(error)}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queueEvents?.close();
    } catch {
      // shutting down — nothing actionable
    }
  }

  /**
   * Handle a single `failed` event. Public so it can be exercised directly in
   * tests without a live Redis. Never throws.
   */
  async handleFailed(jobId: string, failedReason: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      const attemptsMade = job?.attemptsMade ?? 0;
      const maxAttempts = job?.opts?.attempts ?? 1;
      const terminal = attemptsMade >= maxAttempts;

      const line = `notification job ${jobId} failed (attempt ${attemptsMade}/${maxAttempts}): ${failedReason}`;
      if (terminal) {
        this.logger.error(`${line} — moving to dead-letter queue`);
      } else {
        this.logger.warn(`${line} — will retry`);
      }

      if (!terminal || !job) return;

      const deadLetter: DeadLetterJobData = {
        payload: job.data,
        originalJobId: jobId,
        failedReason,
        attemptsMade,
      };
      // Keep the record durably; the DLQ has no worker, so it stays `waiting`.
      await this.deadLetter.add(DEAD_LETTER_JOB, deadLetter, {
        removeOnComplete: false,
        removeOnFail: false,
      });
    } catch (error) {
      this.logger.error(
        `dead-letter handling failed for job ${jobId}: ${String(error)}`,
      );
    }
  }
}
