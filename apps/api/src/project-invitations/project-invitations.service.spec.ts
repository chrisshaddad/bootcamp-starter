import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectInvitationStatus } from '@repo/db';
import type { DatabaseService } from '../database/prisma.service';
import type { GithubService } from '../github/github.service';
import { ProjectInvitationsService } from './project-invitations.service';
import type { ProjectAccessService } from '../projects/project-access.service';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const INVITEE_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const INVITATION_ID = '00000000-0000-4000-8000-000000000004';
const OWNER_GITHUB_ID = 10n;
const INVITEE_GITHUB_ID = 20n;

describe('ProjectInvitationsService', () => {
  let db: ReturnType<typeof createDatabaseMock>;
  let github: ReturnType<typeof createGithubMock>;
  let rateLimiter: {
    assertLookupAllowed: jest.Mock;
    assertCreateAllowed: jest.Mock;
  };
  let mailQueue: { add: jest.Mock };
  let invitationsQueue: { upsertJobScheduler: jest.Mock };
  let service: ProjectInvitationsService;
  let projectAccess: { assertCanManageInvitations: jest.Mock };

  beforeEach(() => {
    db = createDatabaseMock();
    github = createGithubMock();
    rateLimiter = {
      assertLookupAllowed: jest.fn().mockResolvedValue(undefined),
      assertCreateAllowed: jest.fn().mockResolvedValue(undefined),
    };
    mailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    invitationsQueue = {
      upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    };
    projectAccess = {
      assertCanManageInvitations: jest.fn().mockImplementation((user) => {
        if (user.id !== OWNER_ID) {
          throw new ForbiddenException(
            'Only the verified project owner can manage invitations.',
          );
        }
        return Promise.resolve({});
      }),
    };
    service = new ProjectInvitationsService(
      db as unknown as DatabaseService,
      github as unknown as GithubService,
      rateLimiter as never,
      projectAccess as unknown as ProjectAccessService,
      mailQueue as never,
      invitationsQueue as never,
    );
  });

  it('validates an exact GitHub collaborator with a connected platform account', async () => {
    await expect(
      service.searchCollaborator(ownerUser(), PROJECT_ID, 'Invitee'),
    ).resolves.toMatchObject({
      githubUsername: 'invitee',
      githubPermission: 'push',
      platformUser: { displayName: 'Invitee User' },
    });
    expect(rateLimiter.assertLookupAllowed).toHaveBeenCalledWith(
      OWNER_ID,
      PROJECT_ID,
    );
    expect(github.verifyRepositoryOwnership).toHaveBeenCalledWith(
      OWNER_ID,
      'https://github.com/owner/repo',
    );
    expect(github.verifyRepositoryCollaborator).toHaveBeenCalledWith(
      OWNER_ID,
      'owner/repo',
      'Invitee',
    );
  });

  it('does not let a non-owner validate collaborators', async () => {
    await expect(
      service.searchCollaborator(inviteeUser(), PROJECT_ID, 'invitee'),
    ).rejects.toThrow(ForbiddenException);
    expect(github.verifyRepositoryCollaborator).not.toHaveBeenCalled();
  });

  it('requires the GitHub collaborator to have a connected platform account', async () => {
    db.user.findFirst.mockResolvedValue(null);
    await expect(
      service.searchCollaborator(ownerUser(), PROJECT_ID, 'invitee'),
    ).rejects.toThrow(
      'This GitHub user does not have a connected developer account on the platform.',
    );
  });

  it('rejects inviting the repository owner', async () => {
    github.verifyRepositoryCollaborator.mockResolvedValue({
      githubUserId: OWNER_GITHUB_ID,
      githubUsername: 'owner',
      avatarUrl: null,
      permission: 'admin',
      roleName: 'admin',
    });

    await expect(
      service.createInvitation(ownerUser(), PROJECT_ID, {
        githubUsername: 'owner',
        role: 'CONTRIBUTOR',
      }),
    ).rejects.toThrow('The repository owner cannot be invited');
    expect(db.projectInvitation.create).not.toHaveBeenCalled();
  });

  it('rejects a collaborator who is already a project member', async () => {
    db.projectMember.findFirst.mockResolvedValue({ id: 'member-id' });

    await expect(
      service.createInvitation(ownerUser(), PROJECT_ID, {
        githubUsername: 'invitee',
        role: 'CONTRIBUTOR',
      }),
    ).rejects.toThrow('already a project member');
    expect(db.projectInvitation.create).not.toHaveBeenCalled();
  });

  it('creates a pending invitation and queues email without creating membership', async () => {
    const result = await service.createInvitation(ownerUser(), PROJECT_ID, {
      githubUsername: 'invitee',
      role: 'CONTRIBUTOR',
      contributionRoleLabel: 'Backend developer',
    });

    expect(result).toMatchObject({
      id: INVITATION_ID,
      status: 'PENDING',
      inviteeGithubUsername: 'invitee',
    });
    expect(db.projectInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pendingKey: `${PROJECT_ID}:${INVITEE_GITHUB_ID}`,
          inviteeGithubUserId: INVITEE_GITHUB_ID,
          status: 'PENDING',
        }),
      }),
    );
    expect(db.projectMember.create).not.toHaveBeenCalled();
    expect(mailQueue.add).toHaveBeenCalledWith(
      'send-project-invitation',
      expect.objectContaining({ email: 'invitee@example.com' }),
      expect.objectContaining({ attempts: 3 }),
    );
    expect(rateLimiter.assertCreateAllowed).toHaveBeenCalledWith(
      OWNER_ID,
      PROJECT_ID,
    );
  });

  it('removes a created invitation when email enqueueing fails', async () => {
    mailQueue.add.mockRejectedValue(new Error('Redis unavailable'));
    await expect(
      service.createInvitation(ownerUser(), PROJECT_ID, {
        githubUsername: 'invitee',
        role: 'EDITOR',
      }),
    ).rejects.toThrow('The invitation could not be sent');
    expect(db.projectInvitation.create).toHaveBeenCalledTimes(1);
    expect(db.projectInvitation.delete).toHaveBeenCalledWith({
      where: { id: INVITATION_ID },
    });
  });

  it('rejects duplicate pending invitations', async () => {
    db.projectInvitation.findFirst.mockResolvedValue({ id: INVITATION_ID });
    await expect(
      service.createInvitation(ownerUser(), PROJECT_ID, {
        githubUsername: 'invitee',
        role: 'CONTRIBUTOR',
      }),
    ).rejects.toThrow(ConflictException);
    expect(db.projectInvitation.create).not.toHaveBeenCalled();
  });

  it('allows re-invitation when no pending invitation remains', async () => {
    db.projectInvitation.findFirst.mockResolvedValue(null);

    await expect(
      service.createInvitation(ownerUser(), PROJECT_ID, {
        githubUsername: 'invitee',
        role: 'EDITOR',
      }),
    ).resolves.toMatchObject({ status: 'PENDING' });
    expect(db.projectInvitation.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: ProjectInvitationStatus.PENDING,
      }),
      select: { id: true },
    });
  });

  it('accepts transactionally and creates one GitHub-verified member', async () => {
    let status: ProjectInvitationStatus = ProjectInvitationStatus.PENDING;
    db.projectInvitation.findUnique.mockImplementation(() =>
      Promise.resolve(invitation(status)),
    );
    db.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        await input({
          projectInvitation: {
            updateMany: jest.fn().mockImplementation(() => {
              status = ProjectInvitationStatus.ACCEPTED;
              return Promise.resolve({ count: 1 });
            }),
          },
          projectMember: db.projectMember,
        });
        return;
      }
      return input;
    });

    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).resolves.toMatchObject({ status: 'ACCEPTED' });
    expect(github.verifyRepositoryCollaborator).toHaveBeenCalledTimes(1);
    expect(db.projectMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: PROJECT_ID,
        userId: INVITEE_ID,
        githubUserId: INVITEE_GITHUB_ID,
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_COLLABORATOR',
      }),
    });
  });

  it('fails closed when collaborator access was revoked before acceptance', async () => {
    github.verifyRepositoryCollaborator.mockRejectedValue(
      new NotFoundException(
        'This GitHub user is not a repository collaborator.',
      ),
    );
    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).rejects.toThrow(NotFoundException);
    expect(db.projectMember.create).not.toHaveBeenCalled();
  });

  it('returns an already accepted invitation idempotently', async () => {
    db.projectInvitation.findUnique.mockResolvedValue(
      invitation(ProjectInvitationStatus.ACCEPTED),
    );

    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).resolves.toMatchObject({ status: 'ACCEPTED' });
    expect(github.verifyRepositoryCollaborator).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ProjectInvitationStatus.DECLINED,
    ProjectInvitationStatus.CANCELED,
    ProjectInvitationStatus.EXPIRED,
  ])('rejects accepting a %s invitation', async (status) => {
    db.projectInvitation.findUnique.mockResolvedValue(invitation(status));

    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).rejects.toThrow(ConflictException);
    expect(db.projectMember.create).not.toHaveBeenCalled();
  });

  it('returns the winning accepted result during a concurrent acceptance', async () => {
    db.projectInvitation.findUnique
      .mockResolvedValueOnce(invitation(ProjectInvitationStatus.PENDING))
      .mockResolvedValue(invitation(ProjectInvitationStatus.ACCEPTED));
    db.$transaction.mockRejectedValue(
      new ConflictException('This invitation is no longer available.'),
    );

    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).resolves.toMatchObject({ status: 'ACCEPTED' });
  });

  it('prevents another user from accepting the invitation', async () => {
    await expect(
      service.acceptInvitation(ownerUser(), INVITATION_ID),
    ).rejects.toThrow('This invitation belongs to another user.');
    expect(github.verifyRepositoryCollaborator).not.toHaveBeenCalled();
  });

  it('declines without creating a membership', async () => {
    let status: ProjectInvitationStatus = ProjectInvitationStatus.PENDING;
    db.projectInvitation.updateMany.mockImplementation(() => {
      status = ProjectInvitationStatus.DECLINED;
      return Promise.resolve({ count: 1 });
    });
    db.projectInvitation.findUnique.mockImplementation(() =>
      Promise.resolve(invitation(status)),
    );
    await expect(
      service.declineInvitation(inviteeUser(), INVITATION_ID),
    ).resolves.toMatchObject({ status: 'DECLINED' });
    expect(db.projectMember.create).not.toHaveBeenCalled();
  });

  it('allows the recipient to decline after disconnecting GitHub', async () => {
    db.developerProfile.findUnique.mockResolvedValue(null);
    db.projectInvitation.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.declineInvitation(inviteeUser(), INVITATION_ID),
    ).resolves.toBeDefined();
    expect(db.developerProfile.findUnique).not.toHaveBeenCalled();
  });

  it('expires only the current invitee records on request paths', async () => {
    await service.getPendingCount(inviteeUser());

    // The lightweight Prisma mock is intentionally untyped in this legacy suite.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const rawCall: unknown = db.projectInvitation.updateMany.mock.calls[0]?.[0];
    const expiration = rawCall as {
      where: { inviteeUserId?: string; status?: ProjectInvitationStatus };
      data: { status?: ProjectInvitationStatus };
    };
    expect(expiration.where.inviteeUserId).toBe(INVITEE_ID);
    expect(expiration.where.status).toBe(ProjectInvitationStatus.PENDING);
    expect(expiration.data.status).toBe(ProjectInvitationStatus.EXPIRED);
  });

  it('lets only the owner cancel a pending invitation', async () => {
    db.projectInvitation.findFirst.mockResolvedValue(
      invitation(ProjectInvitationStatus.PENDING),
    );
    db.projectInvitation.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    db.projectInvitation.findUnique.mockResolvedValue(
      invitation(ProjectInvitationStatus.CANCELED),
    );

    await expect(
      service.cancelInvitation(ownerUser(), PROJECT_ID, INVITATION_ID),
    ).resolves.toMatchObject({ status: 'CANCELED' });

    await expect(
      service.cancelInvitation(inviteeUser(), PROJECT_ID, INVITATION_ID),
    ).rejects.toThrow(ForbiddenException);
    expect(db.projectMember.create).not.toHaveBeenCalled();
  });

  it('requires the invitee to keep the matching connected GitHub identity', async () => {
    db.developerProfile.findUnique.mockResolvedValue({ githubUserId: 999n });

    await expect(
      service.acceptInvitation(inviteeUser(), INVITATION_ID),
    ).rejects.toThrow('Connect the GitHub account that received');
    expect(github.verifyRepositoryCollaborator).not.toHaveBeenCalled();
  });

  it('marks overdue pending invitations expired', async () => {
    db.projectInvitation.updateMany.mockResolvedValue({ count: 3 });
    await expect(service.expirePendingInvitations()).resolves.toBe(3);
    expect(db.projectInvitation.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: 'PENDING',
        expiresAt: { lte: expect.any(Date) },
      }),
      data: expect.objectContaining({ status: 'EXPIRED', pendingKey: null }),
    });
  });
});

function ownerUser() {
  return { id: OWNER_ID, accountType: 'DEVELOPER' } as never;
}

function inviteeUser() {
  return { id: INVITEE_ID, accountType: 'DEVELOPER' } as never;
}

function ownerProject() {
  return {
    id: PROJECT_ID,
    title: 'Owner Repo',
    slug: 'owner-repo',
    createdByUserId: OWNER_ID,
    repository: {
      id: '00000000-0000-4000-8000-000000000005',
      githubRepoId: 100n,
      ownerGithubUserId: OWNER_GITHUB_ID,
      fullName: 'owner/repo',
      htmlUrl: 'https://github.com/owner/repo',
    },
    createdBy: { developerProfile: { displayName: 'Owner User' } },
  };
}

function invitation(
  status: ProjectInvitationStatus = ProjectInvitationStatus.PENDING,
) {
  return {
    id: INVITATION_ID,
    projectId: PROJECT_ID,
    invitedByUserId: OWNER_ID,
    inviteeUserId: INVITEE_ID,
    inviteeGithubUserId: INVITEE_GITHUB_ID,
    inviteeGithubUsername: 'invitee',
    requestedRole: 'CONTRIBUTOR',
    contributionRoleLabel: 'Backend developer',
    githubPermission: 'push',
    githubRoleName: 'write',
    status,
    pendingKey:
      status === 'PENDING' ? `${PROJECT_ID}:${INVITEE_GITHUB_ID}` : null,
    expiresAt: new Date(Date.now() + 60_000),
    respondedAt: status === 'PENDING' ? null : new Date(),
    canceledAt: null,
    createdAt: new Date('2026-07-17T10:00:00.000Z'),
    updatedAt: new Date('2026-07-17T10:00:00.000Z'),
    project: { ...ownerProject(), repository: ownerProject().repository },
    invitedBy: {
      id: OWNER_ID,
      developerProfile: {
        displayName: 'Owner User',
        publicSlug: 'owner-user',
        profilePictureUrl: null,
      },
    },
    invitee: {
      id: INVITEE_ID,
      developerProfile: {
        displayName: 'Invitee User',
        publicSlug: 'invitee-user',
        profilePictureUrl: null,
      },
    },
  };
}

function createGithubMock() {
  return {
    verifyRepositoryOwnership: jest.fn().mockResolvedValue({
      githubRepoId: '100',
      ownerGithubUserId: OWNER_GITHUB_ID,
      ownerLogin: 'owner',
      ownerType: 'User',
      isFork: false,
    }),
    verifyRepositoryCollaborator: jest.fn().mockResolvedValue({
      githubUserId: INVITEE_GITHUB_ID,
      githubUsername: 'invitee',
      avatarUrl: 'https://avatars.githubusercontent.com/u/20',
      permission: 'push',
      roleName: 'write',
    }),
  };
}

function createDatabaseMock() {
  const projectMember = {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
  };
  const projectInvitation = {
    create: jest.fn().mockResolvedValue(invitation()),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(invitation()),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
  };

  return {
    project: {
      findUnique: jest.fn().mockResolvedValue(ownerProject()),
      update: jest.fn().mockResolvedValue({}),
    },
    repository: { update: jest.fn().mockResolvedValue({}) },
    projectMember,
    projectInvitation,
    developerProfile: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ githubUserId: INVITEE_GITHUB_ID }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({
        id: INVITEE_ID,
        email: 'invitee@example.com',
        developerProfile: {
          displayName: 'Invitee User',
          publicSlug: 'invitee-user',
          profilePictureUrl: null,
        },
      }),
    },
    $transaction: jest.fn().mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input({ projectInvitation, projectMember });
      }
      return input;
    }),
  };
}
