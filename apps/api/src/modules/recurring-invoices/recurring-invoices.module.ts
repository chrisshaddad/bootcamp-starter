import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { RecurringInvoicesProcessor } from './recurring-invoices.processor';
import { RecurringInvoicesSchedulerService } from './recurring-invoices-scheduler.service';
import { RECURRING_INVOICES_QUEUE } from './recurring-invoices.constants';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: RECURRING_INVOICES_QUEUE }),
    NotificationsModule,
  ],
  controllers: [RecurringInvoicesController],
  providers: [
    RecurringInvoicesService,
    RecurringInvoicesProcessor,
    RecurringInvoicesSchedulerService,
  ],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
