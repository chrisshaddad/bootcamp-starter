import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

/**
 * Prisma, OrgScope, LeaseStatus and Timeline are all @Global, so — like
 * ReportsModule — this module only declares its own controller + service.
 */
@Module({
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
