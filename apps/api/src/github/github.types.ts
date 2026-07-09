import type { GithubRepositoryPreviewResponse } from '@repo/contracts';

export interface ParsedGithubRepository {
  owner: string;
  repo: string;
}

export type NormalizedGithubRepository =
  GithubRepositoryPreviewResponse['repository'];

export type NormalizedGithubLanguage =
  GithubRepositoryPreviewResponse['languages'][number];
