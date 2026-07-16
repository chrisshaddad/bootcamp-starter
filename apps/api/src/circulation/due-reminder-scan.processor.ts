import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DueRemindersService } from './due-reminders.service';
import { DUE_REMINDERS_QUEUE } from './due-reminders.constants';

// Stateless trigger, mirroring MailProcessor's shape: its only job is
// kicking off DueRemindersService.runDailyScan() - all the Prisma-aware
// logic lives in the service, not here.
@Processor(DUE_REMINDERS_QUEUE)
export class DueReminderScanProcessor extends WorkerHost {
  private readonly logger = new Logger(DueReminderScanProcessor.name);

  constructor(private readonly dueRemindersService: DueRemindersService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    await this.dueRemindersService.runDailyScan();
  }
}
