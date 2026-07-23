import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DueRemindersService } from './due-reminders.service';
import { ReservationsService } from './reservations.service';
import { DUE_REMINDERS_QUEUE } from './due-reminders.constants';

// Stateless trigger, mirroring MailProcessor's shape: kicks off the nightly
// circulation scan - all the Prisma-aware logic lives in the services, not
// here. Two unrelated-but-both-daily concerns share this one cron rather
// than each getting its own queue/scheduler: rental due reminders, and
// expiring reservations that sat READY_FOR_PICKUP past their pickup window.
@Processor(DUE_REMINDERS_QUEUE)
export class DueReminderScanProcessor extends WorkerHost {
  private readonly logger = new Logger(DueReminderScanProcessor.name);

  constructor(
    private readonly dueRemindersService: DueRemindersService,
    private readonly reservationsService: ReservationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    await this.dueRemindersService.runDailyScan();

    const expiredCount = await this.reservationsService.expireStalePickups();
    this.logger.log(`Expired ${expiredCount} stale pickup reservation(s)`);
  }
}
