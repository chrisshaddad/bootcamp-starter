import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';
import { MS_PER_DAY } from './rentals.service';

type ReminderType = 'DUE_IN_5_DAYS' | 'DUE_TOMORROW' | 'DUE_TODAY';

// Days before (and including) the due date to send a reminder, paired with
// the reminder flavor the mail processor renders.
const REMINDER_SCHEDULE: { daysOut: number; type: ReminderType }[] = [
  { daysOut: 5, type: 'DUE_IN_5_DAYS' },
  { daysOut: 1, type: 'DUE_TOMORROW' },
  { daysOut: 0, type: 'DUE_TODAY' },
];

const dueReminderRentalInclude = {
  bookCopy: { include: { book: { select: { title: true } } } },
  member: { include: { user: { select: { email: true, name: true } } } },
} satisfies Prisma.RentalInclude;

type DueReminderRental = Prisma.RentalGetPayload<{
  include: typeof dueReminderRentalInclude;
}>;

@Injectable()
export class DueRemindersService {
  private readonly logger = new Logger(DueRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /**
   * Daily scan (see CirculationModule's scheduler registration): flips
   * past-due ACTIVE rentals to OVERDUE and finds rentals due in 5 days,
   * tomorrow, or today - all against the same UTC day boundary, read inside
   * one transaction for a consistent snapshot. Reminder emails are then
   * queued after the transaction commits, since talking to Redis has no
   * place inside a DB transaction.
   */
  async runDailyScan(): Promise<void> {
    const today = this.startOfUtcDay(new Date());

    const { overdueCount, reminders } = await this.prisma.$transaction(
      async (tx) => {
        const { count: overdueCount } = await tx.rental.updateMany({
          where: { status: 'ACTIVE', dueDate: { lt: today } },
          data: { status: 'OVERDUE' },
        });

        const reminders = await Promise.all(
          REMINDER_SCHEDULE.map(async ({ daysOut, type }) => ({
            type,
            rentals: await this.findRentalsDueOn(tx, today, daysOut),
          })),
        );

        return { overdueCount, reminders };
      },
    );

    this.logger.log(`Flipped ${overdueCount} rental(s) to OVERDUE`);

    for (const { type, rentals } of reminders) {
      await this.queueReminders(type, rentals);
    }
  }

  private async findRentalsDueOn(
    tx: Prisma.TransactionClient,
    today: Date,
    daysOut: number,
  ): Promise<DueReminderRental[]> {
    const dayStart = new Date(today.getTime() + daysOut * MS_PER_DAY);
    const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);

    return tx.rental.findMany({
      where: { status: 'ACTIVE', dueDate: { gte: dayStart, lt: dayEnd } },
      include: dueReminderRentalInclude,
    });
  }

  private async queueReminders(
    reminderType: ReminderType,
    rentals: DueReminderRental[],
  ): Promise<void> {
    let queuedCount = 0;

    for (const rental of rentals) {
      const email = rental.member.user?.email;

      if (!email) {
        continue;
      }

      await this.mailQueue.add(MAIL_JOBS.SEND_DUE_REMINDER, {
        email,
        userName: rental.member.user?.name,
        bookTitle: rental.bookCopy.book.title,
        dueDate: rental.dueDate.toISOString(),
        reminderType,
      });
      queuedCount++;
    }

    this.logger.log(`Queued ${queuedCount} ${reminderType} reminder(s)`);
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
