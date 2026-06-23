import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  providers: [PlansService],
  controllers: [PlansController],
})
export class PlansModule {}
