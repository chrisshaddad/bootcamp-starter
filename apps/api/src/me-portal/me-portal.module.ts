import { Module } from '@nestjs/common';
import { MePortalService } from './me-portal.service';
import { MePortalController } from './me-portal.controller';

@Module({
  providers: [MePortalService],
  controllers: [MePortalController],
})
export class MePortalModule {}
