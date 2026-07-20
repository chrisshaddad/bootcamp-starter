import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsDeadLetterService } from './notifications-dead-letter.service';
import { NotificationEmailService } from './notification-email.service';
import {
  NOTIFICATIONS_DEAD_LETTER_QUEUE,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: NOTIFICATIONS_QUEUE },
      { name: NOTIFICATIONS_DEAD_LETTER_QUEUE },
    ),
    MailModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationsDeadLetterService,
    NotificationEmailService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
