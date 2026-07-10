import { Module } from '@nestjs/common';
import { RentersController } from './renters.controller';
import { RentersService } from './renters.service';

@Module({
  controllers: [RentersController],
  providers: [RentersService],
  exports: [RentersService],
})
export class RentersModule {}
