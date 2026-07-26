import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

/**
 * Prisma, OrgScope, LeaseStatus and Timeline are all @Global. Notifications is
 * not, and is needed so a tenant-opened maintenance request reaches the org's
 * admins.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
