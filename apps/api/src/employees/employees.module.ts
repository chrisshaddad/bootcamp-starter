import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

// PrismaService (DatabaseModule) and AuditService (AuditModule) are both global,
// so only MailModule needs importing — it exports the BullMQ mail queue used to
// enqueue the invite email.
@Module({
  imports: [MailModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
