import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { FloorsModule } from '@/modules/floors/floors.module';

@Module({
  imports: [FloorsModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
})
export class BuildingsModule {}
