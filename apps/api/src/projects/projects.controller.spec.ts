import { Test } from '@nestjs/testing';
import { AccountType } from '@repo/db';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsService = {
    importGithubProject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: projectsService }],
    }).compile();

    controller = moduleRef.get(ProjectsController);
  });

  it('allows only developer accounts to import repositories', () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      ProjectsController.prototype,
      'importGithubProject',
    )?.value;

    expect(typeof handler).toBe('function');
    expect(Reflect.getMetadata(ROLES_KEY, handler as object)).toEqual([
      AccountType.DEVELOPER,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler as object)).not.toContain(
      AccountType.SUPER_ADMIN,
    );
    expect(Reflect.getMetadata(ROLES_KEY, handler as object)).not.toContain(
      AccountType.HIRING,
    );
  });

  it('delegates GitHub project imports to ProjectsService', async () => {
    const request = {
      repositoryUrl: 'https://github.com/vercel/next.js',
      title: 'Next.js',
    };
    const response = createImportResponse();
    projectsService.importGithubProject.mockResolvedValue(response);

    await expect(
      controller.importGithubProject('user-id', request),
    ).resolves.toEqual(response);
    expect(projectsService.importGithubProject).toHaveBeenCalledWith(
      'user-id',
      request,
    );
  });
});

function createImportResponse() {
  return {
    project: {
      id: '00000000-0000-4000-8000-000000000003',
      title: 'Next.js',
      slug: 'next-js',
      status: 'DRAFT' as const,
      shortDescription: 'The React Framework',
      fullDescription: null,
      deploymentUrl: null,
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      repository: {
        id: '00000000-0000-4000-8000-000000000002',
        githubRepoId: '70107786',
        fullName: 'vercel/next.js',
        ownerLogin: 'vercel',
        repoName: 'next.js',
        htmlUrl: 'https://github.com/vercel/next.js',
        defaultBranch: 'canary',
        visibility: 'PUBLIC' as const,
        lastPushedAt: '2026-07-09T10:00:00.000Z',
        lastSyncedAt: '2026-07-10T10:00:00.000Z',
      },
      technologies: [],
    },
  };
}
