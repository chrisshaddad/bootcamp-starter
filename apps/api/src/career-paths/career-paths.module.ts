import { Module } from '@nestjs/common';
import { CareerPathsController } from './career-paths.controller';
import { CareerPathsService } from './career-paths.service';

@Module({
  controllers: [CareerPathsController],
  providers: [CareerPathsService],
})
export class CareerPathsModule {}
