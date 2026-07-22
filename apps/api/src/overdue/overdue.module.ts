import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OverdueProcessor } from './overdue.processor';
import { OverdueService } from './overdue.service';
import { OVERDUE_QUEUE } from './overdue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: OVERDUE_QUEUE })],
  providers: [OverdueProcessor, OverdueService],
})
export class OverdueModule {}
