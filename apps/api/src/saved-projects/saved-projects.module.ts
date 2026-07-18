import { Module } from '@nestjs/common';
import { SavedProjectsController } from './saved-projects.controller';
import { SavedProjectsService } from './saved-projects.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SavedProjectsController],
  providers: [SavedProjectsService],
})
export class SavedProjectsModule {}
