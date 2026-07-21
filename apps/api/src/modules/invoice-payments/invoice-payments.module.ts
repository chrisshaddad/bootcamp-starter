import { Module } from '@nestjs/common';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsService],
  exports: [InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
