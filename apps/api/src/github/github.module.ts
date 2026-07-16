import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GithubController],
  providers: [GithubService, GithubRepositorySnapshotService],
  exports: [GithubService, GithubRepositorySnapshotService], // Exported snapshot service
})
export class GithubModule {}
