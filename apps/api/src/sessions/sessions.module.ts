import { AuditModule } from '../audit/audit.module';
import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [AuditModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
