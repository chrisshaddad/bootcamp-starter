import { Module } from '@nestjs/common';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  controllers: [GithubController],
  providers: [GithubService, GithubRepositorySnapshotService],
  exports: [GithubService, GithubRepositorySnapshotService],
})
export class GithubModule {}
