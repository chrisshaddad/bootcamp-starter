import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  AccountType,
  ProjectRoleKey,
  VerificationSource,
  VerificationStatus,
  type User,
} from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { GithubRepositorySnapshotService } from '../repository-scanner/github-repository-snapshot.service';
import { ProjectsService } from './projects.service';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const CONTRIBUTOR_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const MEMBER_ID = '00000000-0000-4000-8000-000000000004';

const owner = {
  id: OWNER_ID,
  accountType: AccountType.DEVELOPER,
} as User;

type ProjectMemberCreateArgs = {
  data: {
    projectId: string;
    userId: string | null;
    githubUsername: string;
    role: ProjectRoleKey;
    contributionRoleLabel: string | null;
    verificationStatus: VerificationStatus;
    verificationSource: VerificationSource;
    addedByUserId: string;
  };
};

describe('ProjectsService contributor management', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      {} as GithubRepositorySnapshotService,
    );
  });

  it('adds a GitHub contributor with pending manual verification', async () => {
    await service.addProjectMember(owner, PROJECT_ID, {
      githubUsername: 'octocat',
      role: 'CONTRIBUTOR',
      contributionRoleLabel: 'Frontend developer',
    });

    const createArgs = prisma.projectMember.create.mock.calls[0]?.[0];

    expect(createArgs?.data).toMatchObject({
      projectId: PROJECT_ID,
      userId: null,
      githubUsername: 'octocat',
      role: ProjectRoleKey.CONTRIBUTOR,
      contributionRoleLabel: 'Frontend developer',
      verificationStatus: VerificationStatus.PENDING,
      verificationSource: VerificationSource.MANUAL_INVITE,
      addedByUserId: OWNER_ID,
    });
  });

  it('links a registered developer when adding by user ID', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: CONTRIBUTOR_ID,
      accountType: AccountType.DEVELOPER,
      developerProfile: { githubUsername: 'octocat' },
    });

    await service.addProjectMember(owner, PROJECT_ID, {
      userId: CONTRIBUTOR_ID,
      role: 'EDITOR',
    });

    const createArgs = prisma.projectMember.create.mock.calls[0]?.[0];

    expect(createArgs?.data).toMatchObject({
      userId: CONTRIBUTOR_ID,
      githubUsername: 'octocat',
      role: ProjectRoleKey.EDITOR,
    });
  });

  it('rejects duplicate contributors', async () => {
    prisma.projectMember.findFirst.mockResolvedValue({ id: MEMBER_ID });

    await expect(
      service.addProjectMember(owner, PROJECT_ID, {
        githubUsername: 'octocat',
        role: 'CONTRIBUTOR',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.projectMember.create).not.toHaveBeenCalled();
  });

  it('only allows the project creator or a super admin to manage contributors', async () => {
    const otherDeveloper = {
      id: CONTRIBUTOR_ID,
      accountType: AccountType.DEVELOPER,
    } as User;

    await expect(
      service.addProjectMember(otherDeveloper, PROJECT_ID, {
        githubUsername: 'octocat',
        role: 'CONTRIBUTOR',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not allow the creator owner member to be removed', async () => {
    prisma.projectMember.findFirst.mockResolvedValue({
      id: MEMBER_ID,
      userId: OWNER_ID,
      role: ProjectRoleKey.OWNER,
    });

    await expect(
      service.removeProjectMember(owner, PROJECT_ID, MEMBER_ID),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectMember.delete).not.toHaveBeenCalled();
  });

  it('removes a non-owner contributor', async () => {
    prisma.projectMember.findFirst.mockResolvedValue({
      id: MEMBER_ID,
      userId: CONTRIBUTOR_ID,
      role: ProjectRoleKey.CONTRIBUTOR,
    });

    await service.removeProjectMember(owner, PROJECT_ID, MEMBER_ID);

    expect(prisma.projectMember.delete).toHaveBeenCalledWith({
      where: { id: MEMBER_ID },
    });
  });
});

function createPrismaMock() {
  return {
    project: {
      findUnique: jest.fn().mockResolvedValue({
        id: PROJECT_ID,
        createdByUserId: OWNER_ID,
      }),
    },
    user: {
      findUnique: jest.fn(),
    },
    developerProfile: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    projectMember: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn<Promise<{ id: string }>, [ProjectMemberCreateArgs]>()
        .mockResolvedValue({ id: MEMBER_ID }),
      delete: jest.fn().mockResolvedValue({ id: MEMBER_ID }),
    },
  };
}
