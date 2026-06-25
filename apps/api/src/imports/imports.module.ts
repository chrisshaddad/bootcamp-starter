import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsProcessor } from './imports.processor';
import { DatabaseModule } from '../database/database.module';
import { IMPORT_QUEUE } from './imports.constants';

@Module({
  imports: [DatabaseModule, BullModule.registerQueue({ name: IMPORT_QUEUE })],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
