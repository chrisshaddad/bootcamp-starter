import { Module } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService],
  // Exported so the Stock module can reuse the create path for the
  // "scan barcode → not found → create medicine" flow (barcode-conflict
  // handling, ingredient sync, and MEDICINE_CREATE audit all come for free).
  exports: [MedicinesService],
})
export class MedicinesModule {}
