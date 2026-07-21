import { Module } from '@nestjs/common';
import { AvailableUnitsController } from './available-units.controller';
import { AvailableUnitsService } from './available-units.service';

@Module({
  controllers: [AvailableUnitsController],
  providers: [AvailableUnitsService],
})
export class AvailableUnitsModule {}
