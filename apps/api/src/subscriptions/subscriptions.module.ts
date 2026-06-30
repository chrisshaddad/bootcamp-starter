import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionExpiryProcessor } from './subscription-expiry.processor';
import { SUBSCRIPTION_EXPIRY_QUEUE } from './subscriptions.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SUBSCRIPTION_EXPIRY_QUEUE,
    }),
  ],
  providers: [SubscriptionsService, SubscriptionExpiryProcessor],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
