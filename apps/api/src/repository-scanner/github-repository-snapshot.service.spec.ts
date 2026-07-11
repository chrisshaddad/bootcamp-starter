import { Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  GithubRequestTimeoutException,
  GithubService,
} from '../github/github.service';
import { GithubRepositorySnapshotService } from './github-repository-snapshot.service';

describe('GithubRepositorySnapshotService', () => {
  let service: GithubRepositorySnapshotService;

  const mockGithubService = {
    fetchRepositoryPreview: jest.fn(),
    fetchRepositoryFileText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GithubRepositorySnapshotService(
      mockGithubService as unknown as GithubService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds an analysis preview from fetched repository files', async () => {
    mockGithubService.fetchRepositoryPreview.mockResolvedValue(
      createRepositoryPreview(),
    );
    mockGithubService.fetchRepositoryFileText.mockImplementation(
      (_repository: unknown, path: string) => {
        const files: Record<string, string> = {
          'package.json': JSON.stringify({
            dependencies: {
              react: '^19.0.0',
              '@nestjs/core': '^11.0.0',
            },
          }),
          Dockerfile: 'FROM node:24-alpine',
        };

        return Promise.resolve(files[path] ?? null);
      },
    );

    const preview = await service.previewRepositoryAnalysis(
      'https://github.com/owner/repo',
    );

    expect(mockGithubService.fetchRepositoryPreview).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
    });
    expect(mockGithubService.fetchRepositoryFileText).toHaveBeenCalledWith(
      { owner: 'owner', repo: 'repo' },
      'package.json',
      'main',
    );
    expect(preview.inspectedFiles).toEqual(['package.json', 'Dockerfile']);
    expect(preview.missingOptionalFiles).toContain('docker-compose.yml');
    expect(
      preview.detectedTechnologies.map((technology) => technology.slug),
    ).toEqual(['docker', 'nestjs', 'react', 'typescript']);
  });

  it('does not fail when optional repository files are missing', async () => {
    mockGithubService.fetchRepositoryPreview.mockResolvedValue({
      ...createRepositoryPreview(),
      languages: [],
    });
    mockGithubService.fetchRepositoryFileText.mockResolvedValue(null);

    await expect(
      service.previewRepositoryAnalysis('https://github.com/owner/repo'),
    ).resolves.toMatchObject({
      detectedTechnologies: [],
      inspectedFiles: [],
    });
  });

  it('does not expose fetched repository file contents in the response', async () => {
    mockGithubService.fetchRepositoryPreview.mockResolvedValue(
      createRepositoryPreview(),
    );
    mockGithubService.fetchRepositoryFileText.mockImplementation(
      (_repository: unknown, path: string) =>
        Promise.resolve(
          path === 'Dockerfile'
            ? 'FROM node:24-alpine\nRUN echo analysis-preview-secret'
            : null,
        ),
    );

    const preview = await service.previewRepositoryAnalysis(
      'https://github.com/owner/repo',
    );

    expect(JSON.stringify(preview)).not.toContain('analysis-preview-secret');
  });

  it('limits concurrent optional file requests', async () => {
    mockGithubService.fetchRepositoryPreview.mockResolvedValue(
      createRepositoryPreview(),
    );
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    mockGithubService.fetchRepositoryFileText.mockImplementation(async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeRequests -= 1;
      return null;
    });

    await service.previewRepositoryAnalysis('https://github.com/owner/repo');

    expect(maximumActiveRequests).toBe(4);
    expect(mockGithubService.fetchRepositoryFileText).toHaveBeenCalledTimes(17);
  });

  it('skips a timed-out optional file and completes the preview', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    mockGithubService.fetchRepositoryPreview.mockResolvedValue(
      createRepositoryPreview(),
    );
    mockGithubService.fetchRepositoryFileText.mockImplementation(
      (_repository: unknown, path: string) =>
        path === 'Dockerfile'
          ? Promise.reject(new GithubRequestTimeoutException())
          : Promise.resolve(null),
    );

    const preview = await service.previewRepositoryAnalysis(
      'https://github.com/owner/repo',
    );

    expect(preview.inspectedFiles).toEqual([]);
    expect(preview.missingOptionalFiles).toContain('Dockerfile');
    expect(warn).toHaveBeenCalledWith(
      'Skipping optional GitHub file Dockerfile after request timeout',
    );
  });

  it('keeps non-timeout GitHub failures fatal', async () => {
    mockGithubService.fetchRepositoryPreview.mockResolvedValue(
      createRepositoryPreview(),
    );
    mockGithubService.fetchRepositoryFileText.mockImplementation(
      (_repository: unknown, path: string) =>
        path === 'Dockerfile'
          ? Promise.reject(
              new ServiceUnavailableException('GitHub rate limit exceeded'),
            )
          : Promise.resolve(null),
    );

    await expect(
      service.previewRepositoryAnalysis('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

function createRepositoryPreview() {
  return {
    repository: {
      githubRepoId: '123',
      fullName: 'owner/repo',
      ownerLogin: 'owner',
      repoName: 'repo',
      htmlUrl: 'https://github.com/owner/repo',
      defaultBranch: 'main',
      visibility: 'PUBLIC' as const,
      description: null,
      lastPushedAt: null,
    },
    languages: [{ name: 'TypeScript', bytes: 123 }],
  };
}
