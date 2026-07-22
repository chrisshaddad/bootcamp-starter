import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { projectsExploreQuerySchema } from '@repo/contracts';
import { AccountType, Prisma, type User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { GithubService } from '../github/github.service';
import { ProjectsService } from './projects.service';
import type { ProjectAccessService } from './project-access.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const REPOSITORY_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const REACT_ID = '00000000-0000-4000-8000-000000000004';
const TYPESCRIPT_ID = '00000000-0000-4000-8000-000000000005';
const MEMBER_ID = '00000000-0000-4000-8000-000000000006';
const CREATED_AT = new Date('2026-07-10T10:00:00.000Z');

describe('ProjectsService GitHub import', () => {
  let service: ProjectsService;
  let tx: ReturnType<typeof createTransactionMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let snapshotService: ReturnType<typeof createSnapshotServiceMock>;
  let githubService: ReturnType<typeof createGithubServiceMock>;

  beforeEach(() => {
    tx = createTransactionMock();
    prisma = createPrismaMock(tx);
    snapshotService = createSnapshotServiceMock();
    githubService = createGithubServiceMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      snapshotService as unknown as GithubRepositorySnapshotService,
      githubService as unknown as GithubService,
      {
        assertCanEditContent: jest.fn().mockResolvedValue({
          capabilities: { canPublish: true },
        }),
      } as unknown as ProjectAccessService,
    );
  });

  it('persists a GitHub-verified owner draft with reusable scanner technologies', async () => {
    const response = await service.importGithubProject(USER_ID, {
      repositoryUrl: 'https://github.com/vercel/next.js',
      title: 'Next.js',
      shortDescription: 'The React Framework',
    });

    expect(snapshotService.previewRepositoryAnalysis).toHaveBeenCalledWith(
      'https://github.com/vercel/next.js',
    );
    expect(githubService.verifyRepositoryOwnership).toHaveBeenCalledWith(
      USER_ID,
      'https://github.com/vercel/next.js',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.repository.upsert).toHaveBeenCalledTimes(1);
    const repositoryUpsert = tx.captured.repositoryUpsert as {
      where: { githubRepoId: bigint };
      create: { fullName: string; visibility: string };
      update: { fullName: string; lastSyncedAt: Date };
    };
    expect(repositoryUpsert.where).toEqual({ githubRepoId: 70107786n });
    expect(repositoryUpsert.create).toMatchObject({
      fullName: 'vercel/next.js',
      visibility: 'PUBLIC',
    });
    expect(repositoryUpsert.update.fullName).toBe('vercel/next.js');
    expect(repositoryUpsert.update.lastSyncedAt).toBeInstanceOf(Date);

    const projectCreate = tx.captured.projectCreate as {
      data: {
        repositoryId: string;
        createdByUserId: string;
        title: string;
        slug: string;
        status: string;
        publishedAt: Date | null;
      };
    };
    expect(projectCreate.data).toMatchObject({
      repositoryId: REPOSITORY_ID,
      createdByUserId: USER_ID,
      title: 'Next.js',
      slug: 'next-js',
      status: 'DRAFT',
      publishedAt: null,
    });

    const memberCreate = tx.captured.memberCreate as {
      data: {
        projectId: string;
        userId: string;
        role: string;
        verificationStatus: string;
        verificationSource: string;
        verifiedAt: Date;
      };
    };
    expect(memberCreate.data).toMatchObject({
      projectId: PROJECT_ID,
      userId: USER_ID,
      role: 'OWNER',
      verificationStatus: 'VERIFIED',
      verificationSource: 'GITHUB_OWNER',
    });
    expect(memberCreate.data.verifiedAt).toBeInstanceOf(Date);
    expect(tx.technology.upsert).toHaveBeenCalledTimes(2);
    expect(tx.projectTechnology.upsert).toHaveBeenCalledTimes(2);
    expect(response.project).toMatchObject({
      id: PROJECT_ID,
      slug: 'next-js',
      status: 'DRAFT',
      repository: {
        githubRepoId: '70107786',
      },
    });
    expect(
      response.project.technologies.map((technology) => technology.slug),
    ).toEqual(['react', 'typescript']);
  });

  it('defaults the title and short description from GitHub metadata', async () => {
    await service.importGithubProject(USER_ID, {
      repositoryUrl: 'https://github.com/vercel/next.js',
    });

    const projectCreate = tx.captured.projectCreate as {
      data: { title: string; slug: string; shortDescription: string | null };
    };
    expect(projectCreate.data).toMatchObject({
      title: 'next.js',
      slug: 'next-js',
      shortDescription: 'The React Framework',
    });
  });

  it('appends a numeric suffix when the generated slug already exists', async () => {
    tx.project.findMany.mockResolvedValue([{ slug: 'next-js-clone' }]);

    await service.importGithubProject(USER_ID, {
      repositoryUrl: 'https://github.com/vercel/next.js',
      title: 'Next.js Clone',
    });

    const projectCreate = tx.captured.projectCreate as {
      data: { slug: string };
    };
    expect(projectCreate.data.slug).toBe('next-js-clone-2');
  });

  it('rejects a repository that already has a project', async () => {
    tx.project.findUnique.mockResolvedValue({ id: 'existing-project-id' });

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/vercel/next.js',
      }),
    ).rejects.toThrow(ConflictException);
    expect(tx.project.create).not.toHaveBeenCalled();
    expect(tx.projectMember.create).not.toHaveBeenCalled();
  });

  it('reports concurrent project slug conflicts accurately', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.2.0',
        meta: { target: ['slug'] },
      }),
    );

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/vercel/next.js',
      }),
    ).rejects.toThrow('A project with this slug already exists.');
  });

  it('rejects invalid GitHub repository IDs before starting a transaction', async () => {
    const analysis = createRepositoryAnalysisPreview();
    snapshotService.previewRepositoryAnalysis.mockResolvedValue({
      ...analysis,
      repository: {
        ...analysis.repository,
        githubRepoId: 'not-a-number',
      },
    });

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/vercel/next.js',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('propagates safe GitHub analysis errors without starting a transaction', async () => {
    const error = new NotFoundException(
      'Repository not found, private, or inaccessible.',
    );
    snapshotService.previewRepositoryAnalysis.mockRejectedValue(error);

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/missing/repository',
      }),
    ).rejects.toBe(error);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cannot bypass GitHub ownership by calling the import service directly', async () => {
    githubService.verifyRepositoryOwnership.mockRejectedValue(
      new ForbiddenException(
        'Only the verified GitHub repository owner can publish this project.',
      ),
    );

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/other/repository',
      }),
    ).rejects.toThrow('Only the verified GitHub repository owner');
    expect(snapshotService.previewRepositoryAnalysis).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('revalidates GitHub ownership before publishing', async () => {
    await service.updateProject(
      { id: USER_ID, accountType: 'DEVELOPER' } as never,
      PROJECT_ID,
      { status: 'PUBLISHED' },
    );

    expect(githubService.verifyRepositoryOwnership).toHaveBeenCalledWith(
      USER_ID,
      'https://github.com/vercel/next.js',
    );
    expect(tx.projectMember.upsert).toHaveBeenCalledWith({
      where: {
        projectId_userId: {
          projectId: PROJECT_ID,
          userId: USER_ID,
        },
      },
      create: expect.objectContaining({
        projectId: PROJECT_ID,
        userId: USER_ID,
        githubUserId: 100n,
        githubUsername: 'vercel',
        role: 'OWNER',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: expect.any(Date),
      }),
      update: expect.objectContaining({
        githubUserId: 100n,
        githubUsername: 'vercel',
        role: 'OWNER',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: expect.any(Date),
      }),
    });
    expect(tx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PUBLISHED',
          githubOwnershipVerifiedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('loads only verified members for public project responses', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      createdByUserId: USER_ID,
      slug: 'next-js',
      status: 'PUBLISHED',
      publishedAt: CREATED_AT,
      repository: { htmlUrl: 'https://github.com/vercel/next.js' },
      media: [],
      technologies: [],
      members: [],
    });

    await expect(service.getProjectBySlug('next-js')).resolves.toMatchObject({
      id: PROJECT_ID,
      members: [],
    });
    const query = prisma.project.findUnique.mock.calls[0]?.[0] as unknown as {
      include: { members: { where: { verificationStatus: string } } };
    };
    expect(query.include.members.where).toEqual({
      verificationStatus: 'VERIFIED',
    });
  });

  it('rejects a session whose user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.importGithubProject(USER_ID, {
        repositoryUrl: 'https://github.com/vercel/next.js',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(snapshotService.previewRepositoryAnalysis).not.toHaveBeenCalled();
  });
});

describe('ProjectsService public technology filters', () => {
  it('requires public projects to include every selected technology', async () => {
    const project = {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: PROJECT_ID,
          title: 'Filtered project',
          slug: 'filtered-project',
          logoUrl: null,
          shortDescription: null,
          fullDescription: null,
          deploymentUrl: null,
          status: 'PUBLISHED',
          publishedAt: CREATED_AT,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ]),
    };
    const service = new ProjectsService(
      { project } as unknown as PrismaService,
      createSnapshotServiceMock() as unknown as GithubRepositorySnapshotService,
      {} as GithubService,
      {} as ProjectAccessService,
    );
    const query = projectsExploreQuerySchema.parse({
      technology: ['react', 'typescript'],
    });

    await service.exploreProjects(query);

    const expectedWhere: Prisma.ProjectWhereInput = {
      status: 'PUBLISHED',
      AND: [
        { technologies: { some: { technology: { slug: 'react' } } } },
        { technologies: { some: { technology: { slug: 'typescript' } } } },
      ],
    };
    expect(project.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
  });

  it('accepts repeated or comma-separated technology query values', () => {
    expect(
      projectsExploreQuerySchema.parse({
        technology: ['react', 'typescript'],
      }).technology,
    ).toEqual(['react', 'typescript']);
    expect(
      projectsExploreQuerySchema.parse({ technology: 'react,typescript' })
        .technology,
    ).toEqual(['react', 'typescript']);
  });
});

describe('ProjectsService collaboration access', () => {
  const project = {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const projectAccess = {
    getAccessFromProject: jest.fn().mockReturnValue({
      currentUserRole: 'EDITOR',
      capabilities: {
        canView: true,
        canEditContent: true,
        canPublish: false,
        canManageInvitations: false,
        canDelete: false,
      },
    }),
    assertCanEditContent: jest.fn(),
  };
  const service = new ProjectsService(
    { project } as unknown as PrismaService,
    {} as GithubRepositorySnapshotService,
    {} as GithubService,
    projectAccess as unknown as ProjectAccessService,
  );
  const memberUser = {
    id: USER_ID,
    accountType: AccountType.DEVELOPER,
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    project.count.mockResolvedValue(0);
    project.findMany.mockResolvedValue([]);
  });

  it('filters ALL in the database before applying pagination', async () => {
    await service.getMyProjects(memberUser, {
      scope: 'ALL',
      page: 2,
      limit: 10,
    });

    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
        skip: 10,
        take: 10,
      }),
    );
  });

  it('limits COLLABORATIONS to verified editor/contributor memberships', async () => {
    await service.getMyProjects(memberUser, {
      scope: 'COLLABORATIONS',
      page: 1,
      limit: 20,
    });

    expect(project.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdByUserId: { not: USER_ID },
        members: {
          some: expect.objectContaining({
            userId: USER_ID,
            verificationStatus: 'VERIFIED',
            role: { in: ['EDITOR', 'CONTRIBUTOR'] },
          }),
        },
      }),
    });
  });

  it('rejects editor attempts to include owner-only status fields', async () => {
    projectAccess.assertCanEditContent.mockResolvedValue({
      capabilities: { canPublish: false },
    });

    await expect(
      service.updateProject(memberUser, PROJECT_ID, { status: 'PUBLISHED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(project.findUnique).not.toHaveBeenCalled();
  });
});

describe('ProjectsService member removal', () => {
  const projectMember = {
    deleteMany: jest.fn(),
  };
  const projectAccess = {
    assertCanManageInvitations: jest.fn(),
  };
  const service = new ProjectsService(
    { projectMember } as unknown as PrismaService,
    {} as GithubRepositorySnapshotService,
    {} as GithubService,
    projectAccess as unknown as ProjectAccessService,
  );
  const owner = {
    id: USER_ID,
    accountType: AccountType.DEVELOPER,
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.assertCanManageInvitations.mockResolvedValue({});
  });

  it('removes a verified non-owner member scoped to the project', async () => {
    projectMember.deleteMany.mockResolvedValue({ count: 1 });

    await service.removeProjectMember(owner, PROJECT_ID, MEMBER_ID);

    expect(projectAccess.assertCanManageInvitations).toHaveBeenCalledWith(
      owner,
      PROJECT_ID,
    );
    expect(projectMember.deleteMany).toHaveBeenCalledWith({
      where: {
        id: MEMBER_ID,
        projectId: PROJECT_ID,
        role: { not: 'OWNER' },
        verificationStatus: 'VERIFIED',
      },
    });
  });

  it('does not remove owners or unknown project members', async () => {
    projectMember.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.removeProjectMember(owner, PROJECT_ID, MEMBER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createTransactionMock() {
  const captured: {
    repositoryUpsert?: unknown;
    projectCreate?: unknown;
    memberCreate?: unknown;
  } = {};

  return {
    captured,
    repository: {
      upsert: jest.fn((input: unknown) => {
        captured.repositoryUpsert = input;
        return Promise.resolve({
          id: REPOSITORY_ID,
          githubRepoId: 70107786n,
          fullName: 'vercel/next.js',
          ownerLogin: 'vercel',
          repoName: 'next.js',
          htmlUrl: 'https://github.com/vercel/next.js',
          defaultBranch: 'canary',
          visibility: 'PUBLIC',
          lastPushedAt: new Date('2026-07-09T10:00:00.000Z'),
          lastSyncedAt: CREATED_AT,
        });
      }),
    },
    project: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({
        id: PROJECT_ID,
        status: 'PUBLISHED',
      }),
      create: jest.fn((input: unknown) => {
        captured.projectCreate = input;
        return Promise.resolve({
          id: PROJECT_ID,
          title: 'Next.js',
          slug: 'next-js',
          shortDescription: 'The React Framework',
          fullDescription: null,
          deploymentUrl: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        });
      }),
    },
    projectMember: {
      upsert: jest.fn().mockResolvedValue({ id: 'member-id' }),
      create: jest.fn((input: unknown) => {
        captured.memberCreate = input;
        return Promise.resolve({ id: 'member-id' });
      }),
    },
    technology: {
      upsert: jest
        .fn()
        .mockResolvedValueOnce({
          id: REACT_ID,
          name: 'React',
          slug: 'react',
        })
        .mockResolvedValueOnce({
          id: TYPESCRIPT_ID,
          name: 'TypeScript',
          slug: 'typescript',
        }),
    },
    projectTechnology: {
      upsert: jest.fn().mockResolvedValue({ id: 'project-technology-id' }),
    },
  };
}

function createPrismaMock(tx: ReturnType<typeof createTransactionMock>) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: USER_ID,
        accountType: 'DEVELOPER',
      }),
    },
    project: {
      findUnique: jest.fn().mockResolvedValue({
        id: PROJECT_ID,
        createdByUserId: USER_ID,
        slug: 'next-js',
        publishedAt: null,
        repository: { htmlUrl: 'https://github.com/vercel/next.js' },
      }),
      update: jest.fn().mockResolvedValue({
        id: PROJECT_ID,
        status: 'PUBLISHED',
      }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
}

function createSnapshotServiceMock() {
  return {
    previewRepositoryAnalysis: jest
      .fn()
      .mockResolvedValue(createRepositoryAnalysisPreview()),
  };
}

function createGithubServiceMock() {
  return {
    verifyRepositoryOwnership: jest.fn().mockResolvedValue({
      githubRepoId: '70107786',
      fullName: 'vercel/next.js',
      ownerLogin: 'vercel',
      repoName: 'next.js',
      htmlUrl: 'https://github.com/vercel/next.js',
      defaultBranch: 'canary',
      visibility: 'PUBLIC',
      description: 'The React Framework',
      lastPushedAt: '2026-07-09T10:00:00.000Z',
      ownerGithubUserId: 100n,
      ownerType: 'User',
      isFork: false,
    }),
  };
}

function createRepositoryAnalysisPreview() {
  return {
    repository: {
      githubRepoId: '70107786',
      fullName: 'vercel/next.js',
      ownerLogin: 'vercel',
      repoName: 'next.js',
      htmlUrl: 'https://github.com/vercel/next.js',
      defaultBranch: 'canary',
      visibility: 'PUBLIC',
      description: 'The React Framework',
      lastPushedAt: '2026-07-09T10:00:00.000Z',
    },
    languages: [{ name: 'TypeScript', bytes: 100 }],
    detectedTechnologies: [
      {
        name: 'React',
        slug: 'react',
        category: 'FRAMEWORK',
        evidence: ['Detected dependency "react" in package.json'],
        sourceFiles: ['package.json'],
        signals: ['package-json'],
      },
      {
        name: 'TypeScript',
        slug: 'typescript',
        category: 'LANGUAGE',
        evidence: ['Detected GitHub language "TypeScript" (100 bytes)'],
        sourceFiles: [],
        signals: ['github-language'],
      },
    ],
    inspectedFiles: ['package.json'],
    missingOptionalFiles: ['Dockerfile'],
  };
}
