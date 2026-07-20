import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersOverviewController } from './work-orders-overview.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderApartmentStatusService } from './work-order-apartment-status.service';

@Module({
  controllers: [WorkOrdersController, WorkOrdersOverviewController],
  providers: [WorkOrdersService, WorkOrderApartmentStatusService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
