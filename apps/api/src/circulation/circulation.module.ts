import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { DueRemindersService } from './due-reminders.service';
import { DueReminderScanProcessor } from './due-reminder-scan.processor';
import { MailModule } from '../mail/mail.module';
import {
  DUE_REMINDERS_QUEUE,
  DUE_REMINDERS_JOBS,
  DUE_REMINDER_SCHEDULER_ID,
  DUE_REMINDER_CRON_PATTERN,
} from './due-reminders.constants';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue({ name: DUE_REMINDERS_QUEUE }),
  ],
  providers: [
    RentalsService,
    ReservationsService,
    DueRemindersService,
    DueReminderScanProcessor,
  ],
  controllers: [RentalsController, ReservationsController],
  exports: [RentalsService, ReservationsService],
})
export class CirculationModule implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(DUE_REMINDERS_QUEUE)
    private readonly dueRemindersQueue: Queue,
  ) {}

  // upsertJobScheduler is keyed by scheduler id, so this is a safe idempotent
  // no-op on every subsequent app restart - it won't create duplicate
  // repeatable jobs.
  async onApplicationBootstrap(): Promise<void> {
    await this.dueRemindersQueue.upsertJobScheduler(
      DUE_REMINDER_SCHEDULER_ID,
      { pattern: DUE_REMINDER_CRON_PATTERN, tz: 'UTC' },
      { name: DUE_REMINDERS_JOBS.SCAN },
    );
  }
}
