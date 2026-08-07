import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { DatabaseModule } from '../database/database.module';
import { GithubModule } from '../github/github.module';
import { ProjectAccessService } from './project-access.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, GithubModule, StorageModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessService],
  exports: [ProjectsService, ProjectAccessService],
})
export class ProjectsModule {}
