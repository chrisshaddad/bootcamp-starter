import { Module } from '@nestjs/common';
import { GymsService } from './gyms.service';
import { GymsController } from './gyms.controller';

@Module({
  providers: [GymsService],
  controllers: [GymsController],
})
export class GymsModule {}
