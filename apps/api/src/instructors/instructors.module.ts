import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { InstructorsController } from './instructors.controller';

@Module({
  imports: [AuditModule],
  providers: [InstructorsService],
  controllers: [InstructorsController],
})
export class InstructorsModule {}
