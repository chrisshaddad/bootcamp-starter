import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

// Global so any feature service can inject the audit writer (`AuditService`)
// without each module importing AuditModule — mirrors how DatabaseModule shares
// PrismaService.
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
