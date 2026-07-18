import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DatabaseModule } from '../database/database.module';
import { GithubModule } from '../github/github.module'; // Imported GithubModule
import { ProjectAccessService } from './project-access.service';

@Module({
  imports: [DatabaseModule, GithubModule], // Added GithubModule
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessService],
  exports: [ProjectsService, ProjectAccessService],
})
export class ProjectsModule {}
