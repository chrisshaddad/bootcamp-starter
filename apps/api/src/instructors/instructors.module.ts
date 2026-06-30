import { Module } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { InstructorsController } from './instructors.controller';

@Module({
  providers: [InstructorsService],
  controllers: [InstructorsController],
})
export class InstructorsModule {}
