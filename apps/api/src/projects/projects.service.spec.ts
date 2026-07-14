import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { ProjectsService } from './projects.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const REPOSITORY_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const REACT_ID = '00000000-0000-4000-8000-000000000004';
const TYPESCRIPT_ID = '00000000-0000-4000-8000-000000000005';
const CREATED_AT = new Date('2026-07-10T10:00:00.000Z');

describe('ProjectsService GitHub import', () => {
  let service: ProjectsService;
  let tx: ReturnType<typeof createTransactionMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let snapshotService: ReturnType<typeof createSnapshotServiceMock>;

  beforeEach(() => {
    tx = createTransactionMock();
    prisma = createPrismaMock(tx);
    snapshotService = createSnapshotServiceMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      snapshotService as unknown as GithubRepositorySnapshotService,
    );
  });

  it('persists an unverified draft with reusable scanner technologies', async () => {
    const response = await service.importGithubProject(USER_ID, {
      repositoryUrl: 'https://github.com/vercel/next.js',
      title: 'Next.js',
      shortDescription: 'The React Framework',
    });

    expect(snapshotService.previewRepositoryAnalysis).toHaveBeenCalledWith(
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
        verificationSource: null;
        verifiedAt: null;
      };
    };
    expect(memberCreate.data).toMatchObject({
      projectId: PROJECT_ID,
      userId: USER_ID,
      role: 'OWNER',
      verificationStatus: 'PENDING',
      verificationSource: null,
      verifiedAt: null,
    });
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
      findUnique: jest.fn().mockResolvedValue({ id: USER_ID }),
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
