import { Test } from '@nestjs/testing';
import { AccountType, type User } from '@repo/db';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ObjectStorageService } from '../storage/storage.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsService = {
    importGithubProject: jest.fn(),
    uploadLogo: jest.fn(),
    exploreProjects: jest.fn(),
    removeProjectMember: jest.fn(),
  };
  const objectStorage = {
    upload: jest.fn(),
    deleteMany: jest.fn(),
    keyFromPublicUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: projectsService },
        { provide: ObjectStorageService, useValue: objectStorage },
      ],
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

  it('stores a validated project logo and removes the replaced object', async () => {
    const publicUrl =
      'http://localhost:9000/bootcamp-media/project-media/project/logo.png';
    objectStorage.upload.mockResolvedValue({
      key: 'project-media/project/logo.png',
      publicUrl,
    });
    objectStorage.keyFromPublicUrl.mockReturnValue(
      'project-media/project/old.png',
    );
    projectsService.uploadLogo.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000003',
      repositoryId: '00000000-0000-4000-8000-000000000002',
      createdByUserId: '00000000-0000-4000-8000-000000000001',
      title: 'Project',
      slug: 'project',
      logoUrl: publicUrl,
      shortDescription: null,
      fullDescription: null,
      deploymentUrl: null,
      status: 'DRAFT',
      createdAt: new Date('2026-07-20T10:00:00.000Z'),
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
      publishedAt: null,
      previousLogoUrl:
        'http://localhost:9000/bootcamp-media/project-media/project/old.png',
    });
    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;

    await expect(
      controller.uploadProjectLogo(
        { id: 'user-id' } as User,
        'project-id',
        file,
      ),
    ).resolves.toMatchObject({ logoUrl: publicUrl });
    expect(projectsService.uploadLogo).toHaveBeenCalledWith(
      expect.anything(),
      'project-id',
      publicUrl,
    );
    expect(objectStorage.deleteMany).toHaveBeenCalledWith([
      'project-media/project/old.png',
    ]);
  });

  it('removes a newly uploaded object when persistence fails', async () => {
    objectStorage.upload.mockResolvedValue({
      key: 'project-media/project/new.png',
      publicUrl:
        'http://localhost:9000/bootcamp-media/project-media/project/new.png',
    });
    projectsService.uploadLogo.mockRejectedValue(
      new Error('database unavailable'),
    );
    const file = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;

    await expect(
      controller.uploadProjectLogo(
        { id: 'user-id' } as User,
        'project-id',
        file,
      ),
    ).rejects.toThrow('database unavailable');
    expect(objectStorage.deleteMany).toHaveBeenCalledWith([
      'project-media/project/new.png',
    ]);
  });

  it('delegates project member removal to ProjectsService', async () => {
    projectsService.removeProjectMember.mockResolvedValue(undefined);
    const user = {
      id: 'owner-id',
      accountType: AccountType.DEVELOPER,
    };

    await expect(
      controller.removeProjectMember(user as User, 'project-id', 'member-id'),
    ).resolves.toEqual({ success: true });
    expect(projectsService.removeProjectMember).toHaveBeenCalledWith(
      user,
      'project-id',
      'member-id',
    );
  });

  it('normalizes profile pictures in explore responses', async () => {
    const timestamp = new Date('2026-07-22T00:00:00.000Z');
    projectsService.exploreProjects.mockResolvedValue({
      data: [
        {
          id: 'project-id',
          title: 'Project',
          slug: 'project',
          logoUrl: null,
          shortDescription: null,
          fullDescription: null,
          deploymentUrl: null,
          status: 'PUBLISHED',
          publishedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          repository: { htmlUrl: 'https://github.com/owner/project' },
          media: [],
          technologies: [],
          createdBy: {
            id: 'owner-id',
            developerProfile: {
              displayName: 'Owner',
              headline: null,
              profilePictureUrl: '/uploads/profile-pictures/owner.png',
              githubUsername: 'owner',
            },
          },
          members: [
            {
              user: {
                id: 'member-id',
                developerProfile: {
                  displayName: 'Member',
                  profilePictureUrl: '/uploads/profile-pictures/member.png',
                },
              },
            },
          ],
          _count: { members: 1 },
        },
      ],
      meta: {
        totalItems: 1,
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const response = await controller.exploreProjects({
      page: 1,
      limit: 20,
      sort: 'latest',
      technology: [],
    });

    expect(response.data[0]?.createdBy?.profilePictureUrl).toBe(
      'http://localhost:3001/uploads/profile-pictures/owner.png',
    );
    expect(response.data[0]?.contributors[0]?.profilePictureUrl).toBe(
      'http://localhost:3001/uploads/profile-pictures/member.png',
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
