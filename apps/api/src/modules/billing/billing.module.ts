import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { PlansController } from './plans.controller';

@Module({
  controllers: [BillingController, PlansController],
  providers: [BillingService, StripeService],
  exports: [StripeService],
})
export class BillingModule {}
