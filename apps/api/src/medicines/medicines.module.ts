import { Module } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService],
})
export class MedicinesModule {}
