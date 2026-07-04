export type RepositoryVisibility = 'PUBLIC' | 'PRIVATE';

export interface ParsedGithubRepository {
  owner: string;
  repo: string;
}

export interface NormalizedGithubRepository {
  githubRepoId: string;
  fullName: string;
  ownerLogin: string;
  repoName: string;
  htmlUrl: string;
  defaultBranch: string | null;
  isPrivate: boolean;
  visibility: RepositoryVisibility;
  description: string | null;
  lastPushedAt: string | null;
  primaryLanguage: string | null;
}

export interface NormalizedGithubLanguage {
  name: string;
  bytes: number;
}
