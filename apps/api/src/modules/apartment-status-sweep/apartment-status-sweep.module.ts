import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ApartmentStatusSweepController } from './apartment-status-sweep.controller';
import { ApartmentStatusSweepService } from './apartment-status-sweep.service';
import { ApartmentStatusSweepProcessor } from './apartment-status-sweep.processor';
import { ApartmentStatusSweepSchedulerService } from './apartment-status-sweep-scheduler.service';
import { APARTMENT_STATUS_SWEEP_QUEUE } from './apartment-status-sweep.constants';

@Module({
  imports: [BullModule.registerQueue({ name: APARTMENT_STATUS_SWEEP_QUEUE })],
  controllers: [ApartmentStatusSweepController],
  providers: [
    ApartmentStatusSweepService,
    ApartmentStatusSweepProcessor,
    ApartmentStatusSweepSchedulerService,
  ],
  exports: [ApartmentStatusSweepService],
})
export class ApartmentStatusSweepModule {}
