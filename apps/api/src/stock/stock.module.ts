import { Module } from '@nestjs/common';
import { MedicinesModule } from '../medicines/medicines.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

// PrismaService (DatabaseModule) and AuditService (AuditModule) are both global.
// MedicinesModule is imported so the barcode-not-found path can reuse
// MedicinesService.create instead of duplicating catalog-creation logic.
@Module({
  imports: [MedicinesModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
