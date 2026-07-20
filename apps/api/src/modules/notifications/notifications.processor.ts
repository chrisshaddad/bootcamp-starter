import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';
import { NotificationEmailService } from './notification-email.service';

/**
 * Consumes the notifications queue and delivers each job:
 *  1. persist an in-app Notification row (source of truth — must always happen);
 *  2. best-effort email delivery (gated by NOTIFICATIONS_EMAIL, never throws).
 * Push can be added the same way without touching producers.
 */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly email: NotificationEmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    // In-app first so a downstream email issue can never lose the notification.
    await this.notifications.persist(job.data);
    await this.email.deliver(job.data);
    this.logger.debug(
      `Delivered notification '${job.data.type}' to ${job.data.userId}`,
    );
  }
}
