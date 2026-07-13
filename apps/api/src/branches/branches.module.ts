import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

// PrismaService (DatabaseModule) and AuditService (AuditModule) are both global,
// so this module needs no imports of its own.
@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
