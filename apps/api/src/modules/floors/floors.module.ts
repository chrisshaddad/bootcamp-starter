import { Module } from '@nestjs/common';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { ApartmentsModule } from '@/modules/apartments/apartments.module';

@Module({
  imports: [ApartmentsModule],
  controllers: [FloorsController],
  providers: [FloorsService],
  exports: [FloorsService],
})
export class FloorsModule {}
