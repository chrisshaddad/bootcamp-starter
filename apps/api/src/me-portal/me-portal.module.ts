import { Module } from '@nestjs/common';
import { MePortalService } from './me-portal.service';
import { MePortalController } from './me-portal.controller';
import { AuthModule } from '../auth/auth.module';
import { CheckInsModule } from '../checkins/checkins.module';

@Module({
  imports: [AuthModule, CheckInsModule],
  providers: [MePortalService],
  controllers: [MePortalController],
})
export class MePortalModule {}
