import type {
  GithubDetectedTechnology,
  GithubRepositoryPreviewResponse,
} from '@repo/contracts';

export type TechnologyCategory = GithubDetectedTechnology['category'];
export type DetectionSignal = GithubDetectedTechnology['signals'][number];

export type RepositoryLanguageStat =
  GithubRepositoryPreviewResponse['languages'][number];

export interface RepositorySnapshotFile {
  path: string;
  content: string;
}

export interface RepositorySnapshot {
  repository?: {
    fullName?: string;
    defaultBranch?: string | null;
  };
  languages?: RepositoryLanguageStat[];
  files?: RepositorySnapshotFile[];
}

export interface TechnologyDefinition {
  name: string;
  slug: string;
  category: TechnologyCategory;
}

export type DetectedTechnology = GithubDetectedTechnology;
