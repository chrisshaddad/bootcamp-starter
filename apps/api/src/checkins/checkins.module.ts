import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { CheckInsService } from './checkins.service';
import { CheckInsController } from './checkins.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [CheckInsService],
  controllers: [CheckInsController],
  exports: [CheckInsService],
})
export class CheckInsModule {}
