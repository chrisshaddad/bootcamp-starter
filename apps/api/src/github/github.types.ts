import type { GithubRepositoryPreviewResponse } from '@repo/contracts';

export interface ParsedGithubRepository {
  owner: string;
  repo: string;
}

export type NormalizedGithubRepository =
  GithubRepositoryPreviewResponse['repository'];

export type NormalizedGithubLanguage =
  GithubRepositoryPreviewResponse['languages'][number];

export interface VerifiedGithubRepository extends NormalizedGithubRepository {
  ownerGithubUserId: bigint;
  ownerType: 'User';
  isFork: false;
}

export interface VerifiedGithubCollaborator {
  githubUserId: bigint;
  githubUsername: string;
  avatarUrl: string | null;
  permission: string;
  roleName: string | null;
}
