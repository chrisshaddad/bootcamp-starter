import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderApartmentStatusService } from './work-order-apartment-status.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrderApartmentStatusService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
