import { Test } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

describe('GithubController', () => {
  let controller: GithubController;

  const mockGithubService = {
    previewRepository: jest.fn(),
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
      ],
    }).compile();

    controller = moduleRef.get(GithubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('requires developer accounts for repository previews', () => {
    const previewRepositoryHandler: unknown = Object.getOwnPropertyDescriptor(
      GithubController.prototype,
      'previewRepository',
    )?.value;

    expect(typeof previewRepositoryHandler).toBe('function');
    expect(
      Reflect.getMetadata(ROLES_KEY, previewRepositoryHandler as object),
    ).toEqual(['DEVELOPER']);
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
        isPrivate: false,
        visibility: 'PUBLIC' as const,
        description: null,
        lastPushedAt: null,
        primaryLanguage: null,
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
});
