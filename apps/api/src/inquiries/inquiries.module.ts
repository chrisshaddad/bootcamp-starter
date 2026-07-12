import { Module } from '@nestjs/common';
import { MedicinesModule } from '../medicines/medicines.module';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

// PrismaService (DatabaseModule) and AuditService (AuditModule) are both global.
// MedicinesModule is imported so the thread's context panel can reuse
// MedicinesService.getById for the full, canonical medicine record.
@Module({
  imports: [MedicinesModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
