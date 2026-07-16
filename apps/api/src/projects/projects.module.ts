import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DatabaseModule } from '../database/database.module';
import { GithubModule } from '../github/github.module'; // Imported GithubModule

@Module({
  imports: [DatabaseModule, GithubModule], // Added GithubModule
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
