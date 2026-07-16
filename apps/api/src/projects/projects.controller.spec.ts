import { Test } from '@nestjs/testing';
import { AccountType } from '@repo/db';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsService = {
    importGithubProject: jest.fn(),
    addProjectMember: jest.fn(),
    removeProjectMember: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: projectsService }],
    }).compile();

    controller = moduleRef.get(ProjectsController);
  });

  it('allows developer and super admin imports but not hiring accounts', () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      ProjectsController.prototype,
      'importGithubProject',
    )?.value;

    expect(typeof handler).toBe('function');
    expect(Reflect.getMetadata(ROLES_KEY, handler as object)).toEqual([
      AccountType.DEVELOPER,
      AccountType.SUPER_ADMIN,
    ]);
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

  it('allows developer and super admin accounts to manage contributors', () => {
    const addMemberHandler: unknown = Object.getOwnPropertyDescriptor(
      ProjectsController.prototype,
      'addProjectMember',
    )?.value;
    const removeMemberHandler: unknown = Object.getOwnPropertyDescriptor(
      ProjectsController.prototype,
      'removeProjectMember',
    )?.value;

    expect(Reflect.getMetadata(ROLES_KEY, addMemberHandler as object)).toEqual([
      AccountType.DEVELOPER,
      AccountType.SUPER_ADMIN,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, removeMemberHandler as object),
    ).toEqual([AccountType.DEVELOPER, AccountType.SUPER_ADMIN]);
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
