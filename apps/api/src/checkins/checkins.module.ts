import { Module } from '@nestjs/common';
import { CheckInsService } from './checkins.service';
import { CheckInsController } from './checkins.controller';

@Module({
  providers: [CheckInsService],
  controllers: [CheckInsController],
})
export class CheckInsModule {}
