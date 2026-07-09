import { Injectable } from '@nestjs/common';
import type { GithubRepositoryAnalysisPreviewResponse } from '@repo/contracts';
import { GithubService } from '../github/github.service';
import type { ParsedGithubRepository } from '../github/github.types';
import { parseGithubRepositoryUrl } from '../github/github-url.parser';
import { analyzeRepositorySnapshot } from './repository-analyzer';
import type { RepositorySnapshotFile } from './repository-scanner.types';

const GITHUB_ANALYSIS_FILE_PATHS = [
  'package.json',
  'Dockerfile',
  'docker-compose.yml',
  'compose.yml',
  'prisma/schema.prisma',
  '.github/workflows/ci.yml',
  '.github/workflows/ci.yaml',
  '.github/workflows/test.yml',
  '.github/workflows/test.yaml',
  '.github/workflows/build.yml',
  '.github/workflows/build.yaml',
  'requirements.txt',
  'pyproject.toml',
  'pom.xml',
  'build.gradle',
  'go.mod',
  'Cargo.toml',
] as const;

@Injectable()
export class GithubRepositorySnapshotService {
  constructor(private readonly githubService: GithubService) {}

  async previewRepositoryAnalysis(
    repositoryUrl: string,
  ): Promise<GithubRepositoryAnalysisPreviewResponse> {
    const repository = parseGithubRepositoryUrl(repositoryUrl);
    const preview = await this.githubService.fetchRepositoryPreview(repository);
    const files = await this.fetchSnapshotFiles(
      repository,
      preview.repository.defaultBranch,
    );
    const inspectedFiles = files.map((file) => file.path);
    const missingOptionalFiles = GITHUB_ANALYSIS_FILE_PATHS.filter(
      (path) => !inspectedFiles.includes(path),
    );

    return {
      ...preview,
      detectedTechnologies: analyzeRepositorySnapshot({
        repository: {
          fullName: preview.repository.fullName,
          defaultBranch: preview.repository.defaultBranch,
        },
        languages: preview.languages,
        files,
      }),
      inspectedFiles,
      missingOptionalFiles,
    };
  }

  private async fetchSnapshotFiles(
    repository: ParsedGithubRepository,
    ref: string | null,
  ): Promise<RepositorySnapshotFile[]> {
    const fetchedFiles = await Promise.all(
      GITHUB_ANALYSIS_FILE_PATHS.map(async (path) => ({
        path,
        content: await this.githubService.fetchRepositoryFileText(
          repository,
          path,
          ref,
        ),
      })),
    );

    return fetchedFiles.flatMap((file) =>
      file.content === null
        ? []
        : [
            {
              path: file.path,
              content: file.content,
            },
          ],
    );
  }
}
