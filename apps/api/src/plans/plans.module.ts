import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  imports: [AuditModule],
  providers: [PlansService],
  controllers: [PlansController],
})
export class PlansModule {}
