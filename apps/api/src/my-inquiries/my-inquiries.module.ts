import { Module } from '@nestjs/common';
import { MedicinesModule } from '../medicines/medicines.module';
import { MyInquiriesController } from './my-inquiries.controller';
import { MyInquiriesService } from './my-inquiries.service';

// PrismaService (DatabaseModule) and AuditService (AuditModule) are global.
// MedicinesModule is imported so the thread detail can reuse
// MedicinesService.getById for the full, canonical medicine record — the same
// way the staff InquiriesModule does.
@Module({
  imports: [MedicinesModule],
  controllers: [MyInquiriesController],
  providers: [MyInquiriesService],
})
export class MyInquiriesModule {}
