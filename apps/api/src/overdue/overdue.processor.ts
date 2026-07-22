import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { LATE_FEE_PER_DAY, MS_PER_DAY } from '../circulation/rentals.service';
import { OVERDUE_QUEUE, OVERDUE_JOBS } from './overdue.constants';

/**
 * Background maintenance worker: transitions unreturned, past-due rentals to
 * OVERDUE and accrues their late fee. Runs platform-wide (all organizations) —
 * it's a scheduled sweep, not a tenant-scoped request.
 */
@Processor(OVERDUE_QUEUE)
export class OverdueProcessor extends WorkerHost {
  private readonly logger = new Logger(OverdueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== OVERDUE_JOBS.AGE_OVERDUE) {
      this.logger.warn(`Unknown job type: ${job.name}`);
      return;
    }

    await this.ageOverdue();
  }

  private async ageOverdue(): Promise<void> {
    const now = new Date();

    const dueRentals = await this.prisma.rental.findMany({
      where: {
        returnedAt: null,
        dueDate: { lt: now },
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      select: { id: true, dueDate: true, finePaid: true },
    });

    for (const rental of dueRentals) {
      const lateDays = Math.max(
        0,
        Math.ceil((now.getTime() - rental.dueDate.getTime()) / MS_PER_DAY),
      );
      const fineAmount = (lateDays * LATE_FEE_PER_DAY).toFixed(2);

      // Don't overwrite a fine that's already been settled.
      await this.prisma.rental.update({
        where: { id: rental.id },
        data: rental.finePaid
          ? { status: 'OVERDUE' }
          : { status: 'OVERDUE', fineAmount },
      });
    }

    if (dueRentals.length > 0) {
      this.logger.log(`Aged ${dueRentals.length} overdue rental(s).`);
    }
  }
}
