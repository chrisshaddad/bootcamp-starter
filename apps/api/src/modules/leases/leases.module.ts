import { Module } from '@nestjs/common';
import { LeasesController } from './leases.controller';
import { LeasesOverviewController } from './leases-overview.controller';
import { LeasesService } from './leases.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LeasesController, LeasesOverviewController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
