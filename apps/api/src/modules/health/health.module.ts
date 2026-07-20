import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { NOTIFICATIONS_QUEUE } from '@/modules/notifications/notifications.constants';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [
    TerminusModule,
    // Reuse the same queue/connection the app runs on so /health reflects the
    // real Redis the notifications pipeline depends on.
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
