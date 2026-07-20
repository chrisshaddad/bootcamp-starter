import { Module } from '@nestjs/common';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';

@Module({
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsService],
  exports: [InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
