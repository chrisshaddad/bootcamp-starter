import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { GymsController } from './gyms.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule, AuditModule],
  providers: [GymsService],
  controllers: [GymsController],
})
export class GymsModule {}
