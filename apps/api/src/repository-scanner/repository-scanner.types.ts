export type TechnologyCategory =
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'DATABASE'
  | 'CLOUD'
  | 'DEVOPS'
  | 'TOOL'
  | 'OTHER';

export type DetectionSignal =
  | 'github-language'
  | 'package-json'
  | 'dockerfile'
  | 'docker-compose'
  | 'prisma-schema'
  | 'github-actions';

export interface RepositoryLanguageStat {
  name: string;
  bytes: number;
}

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

export interface DetectedTechnology extends TechnologyDefinition {
  evidence: string[];
  sourceFiles: string[];
  signals: DetectionSignal[];
}
