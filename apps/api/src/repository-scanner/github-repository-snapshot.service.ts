import { Injectable, Logger } from '@nestjs/common';
import type { GithubRepositoryAnalysisPreviewResponse } from '@repo/contracts';
import {
  GithubRequestTimeoutException,
  GithubService,
} from '../github/github.service';
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
const MAX_CONCURRENT_FILE_REQUESTS = 4;

@Injectable()
export class GithubRepositorySnapshotService {
  private readonly logger = new Logger(GithubRepositorySnapshotService.name);

  constructor(private readonly githubService: GithubService) {}

  /** Builds an analysis preview from GitHub metadata and selected source/config files. */
  async previewRepositoryAnalysis(
    repositoryUrl: string,
  ): Promise<GithubRepositoryAnalysisPreviewResponse> {
    const repository = parseGithubRepositoryUrl(repositoryUrl);
    this.logger.debug(
      `Starting GitHub analysis preview for ${repository.owner}/${repository.repo}`,
    );

    const preview = await this.githubService.fetchRepositoryPreview(repository);
    const files = await this.fetchSnapshotFiles(
      repository,
      preview.repository.defaultBranch,
    );
    const inspectedFiles = files.map((file) => file.path);
    const missingOptionalFiles = GITHUB_ANALYSIS_FILE_PATHS.filter(
      (path) => !inspectedFiles.includes(path),
    );
    const detectedTechnologies = analyzeRepositorySnapshot({
      repository: {
        fullName: preview.repository.fullName,
        defaultBranch: preview.repository.defaultBranch,
      },
      languages: preview.languages,
      files,
    });

    this.logger.debug(
      `Completed GitHub analysis preview for ${preview.repository.fullName}: ${detectedTechnologies.length} technologies, ${inspectedFiles.length} files inspected`,
    );

    return {
      ...preview,
      detectedTechnologies,
      inspectedFiles,
      missingOptionalFiles,
    };
  }

  /** Fetches optional scanner files from the repository default branch. */
  private async fetchSnapshotFiles(
    repository: ParsedGithubRepository,
    ref: string | null,
  ): Promise<RepositorySnapshotFile[]> {
    const fetchedFiles: Array<{ path: string; content: string | null }> = [];

    for (
      let index = 0;
      index < GITHUB_ANALYSIS_FILE_PATHS.length;
      index += MAX_CONCURRENT_FILE_REQUESTS
    ) {
      const batch = GITHUB_ANALYSIS_FILE_PATHS.slice(
        index,
        index + MAX_CONCURRENT_FILE_REQUESTS,
      );
      const batchFiles = await Promise.all(
        batch.map((path) =>
          this.fetchOptionalSnapshotFile(repository, path, ref),
        ),
      );
      fetchedFiles.push(...batchFiles);
    }

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

  private async fetchOptionalSnapshotFile(
    repository: ParsedGithubRepository,
    path: string,
    ref: string | null,
  ): Promise<{ path: string; content: string | null }> {
    try {
      const content = await this.githubService.fetchRepositoryFileText(
        repository,
        path,
        ref,
      );
      return { path, content };
    } catch (error) {
      if (error instanceof GithubRequestTimeoutException) {
        this.logger.warn(
          `Skipping optional GitHub file ${path} after request timeout`,
        );
        return { path, content: null };
      }

      throw error;
    }
  }
}
