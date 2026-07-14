import { Test } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

describe('GithubController', () => {
  let controller: GithubController;

  const mockGithubService = {
    previewRepository: jest.fn(),
  };
  const mockGithubRepositorySnapshotService = {
    previewRepositoryAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        {
          provide: GithubService,
          useValue: mockGithubService,
        },
        {
          provide: GithubRepositorySnapshotService,
          useValue: mockGithubRepositorySnapshotService,
        },
      ],
    }).compile();

    controller = moduleRef.get(GithubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('requires developer or super admin accounts for repository previews', () => {
    const previewRepositoryHandler: unknown = Object.getOwnPropertyDescriptor(
      GithubController.prototype,
      'previewRepository',
    )?.value;

    expect(typeof previewRepositoryHandler).toBe('function');
    expect(
      Reflect.getMetadata(ROLES_KEY, previewRepositoryHandler as object),
    ).toEqual(['DEVELOPER', 'SUPER_ADMIN']);
  });

  it('requires developer or super admin accounts for analysis previews', () => {
    const previewRepositoryAnalysisHandler: unknown =
      Object.getOwnPropertyDescriptor(
        GithubController.prototype,
        'previewRepositoryAnalysis',
      )?.value;

    expect(typeof previewRepositoryAnalysisHandler).toBe('function');
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        previewRepositoryAnalysisHandler as object,
      ),
    ).toEqual(['DEVELOPER', 'SUPER_ADMIN']);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        previewRepositoryAnalysisHandler as object,
      ),
    ).not.toContain('HIRING');
  });

  it('delegates repository previews to GithubService', async () => {
    const response = {
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
      languages: [],
    };
    mockGithubService.previewRepository.mockResolvedValue(response);

    await expect(
      controller.previewRepository({
        repositoryUrl: 'https://github.com/owner/repo',
      }),
    ).resolves.toEqual(response);
    expect(mockGithubService.previewRepository).toHaveBeenCalledWith(
      'https://github.com/owner/repo',
    );
  });

  it('delegates repository analysis previews to GithubRepositorySnapshotService', async () => {
    const response = {
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
      languages: [],
      detectedTechnologies: [],
      inspectedFiles: [],
      missingOptionalFiles: ['package.json'],
    };
    mockGithubRepositorySnapshotService.previewRepositoryAnalysis.mockResolvedValue(
      response,
    );

    await expect(
      controller.previewRepositoryAnalysis({
        repositoryUrl: 'https://github.com/owner/repo',
      }),
    ).resolves.toEqual(response);
    expect(
      mockGithubRepositorySnapshotService.previewRepositoryAnalysis,
    ).toHaveBeenCalledWith('https://github.com/owner/repo');
  });
});
