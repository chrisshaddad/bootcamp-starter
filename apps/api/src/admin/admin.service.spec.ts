import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import type { DatabaseService } from '../database/prisma.service';
import type { SessionService } from '../auth/session.service';

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const REPOSITORY_ID = '00000000-0000-4000-8000-000000000004';
const NOW = new Date('2026-07-18T10:00:00.000Z');

function accountRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'developer@example.com',
    passwordHash: 'never-returned',
    accountType: 'DEVELOPER',
    status: 'SUSPENDED',
    isConfirmed: true,
    suspendedAt: NOW,
    suspensionReason: 'Repeated platform abuse',
    createdAt: NOW,
    updatedAt: NOW,
    developerProfile: {
      displayName: 'Developer Example',
      githubUsername: 'developer-example',
    },
    hiringProfile: null,
    connectedAccount: { id: '00000000-0000-4000-8000-000000000005' },
    _count: { createdProjects: 2, projectMemberships: 1, sessions: 0 },
    ...overrides,
  };
}

function projectRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: PROJECT_ID,
    repositoryId: REPOSITORY_ID,
    createdByUserId: USER_ID,
    title: 'Project Example',
    slug: 'project-example',
    logoUrl: null,
    shortDescription: null,
    fullDescription: null,
    deploymentUrl: null,
    status: 'SUSPENDED',
    githubOwnershipVerifiedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: null,
    moderatedAt: NOW,
    moderationReason: 'Unsafe content was published',
    moderatedByUserId: ACTOR_ID,
    repository: { fullName: 'developer/project-example' },
    createdBy: {
      id: USER_ID,
      email: 'developer@example.com',
      developerProfile: { displayName: 'Developer Example' },
      hiringProfile: null,
    },
    _count: { members: 2 },
    ...overrides,
  };
}

interface AccountUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
  include: unknown;
}

interface ProjectUpdateArgs {
  where: { id: string };
  data: Record<string, unknown>;
  include: unknown;
}

interface AuditCreateArgs {
  data: Record<string, unknown>;
}

interface TransactionMocks {
  user: { update: jest.Mock<unknown, [AccountUpdateArgs]> };
  project: { update: jest.Mock<unknown, [ProjectUpdateArgs]> };
  adminAuditLog: { create: jest.Mock<unknown, [AuditCreateArgs]> };
}

describe('AdminService', () => {
  let database: {
    user: { findUnique: jest.Mock<unknown, [unknown]> };
    project: { findUnique: jest.Mock<unknown, [unknown]> };
    $transaction: jest.Mock<
      Promise<unknown>,
      [(client: TransactionMocks) => Promise<unknown>]
    >;
  };
  let tx: TransactionMocks;
  let sessions: {
    deleteAllUserSessions: jest.Mock<Promise<void>, [string]>;
  };
  let service: AdminService;

  beforeEach(() => {
    tx = {
      user: { update: jest.fn<unknown, [AccountUpdateArgs]>() },
      project: { update: jest.fn<unknown, [ProjectUpdateArgs]>() },
      adminAuditLog: { create: jest.fn<unknown, [AuditCreateArgs]>() },
    };
    database = {
      user: { findUnique: jest.fn<unknown, [unknown]>() },
      project: { findUnique: jest.fn<unknown, [unknown]>() },
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: TransactionMocks) => Promise<unknown>]
      >((callback) => callback(tx)),
    };
    sessions = {
      deleteAllUserSessions: jest.fn<Promise<void>, [string]>(),
    };
    service = new AdminService(
      database as unknown as DatabaseService,
      sessions as unknown as SessionService,
    );
  });

  it('suspends an account, writes an audit record, and revokes sessions', async () => {
    database.user.findUnique.mockResolvedValue({
      id: USER_ID,
      accountType: 'DEVELOPER',
      status: 'ACTIVE',
    });
    tx.user.update.mockResolvedValue(accountRecord());

    const result = await service.updateAccountStatus(ACTOR_ID, USER_ID, {
      status: 'SUSPENDED',
      reason: 'Repeated platform abuse',
    });

    const accountUpdate = tx.user.update.mock.calls[0]?.[0];
    expect(accountUpdate?.where).toEqual({ id: USER_ID });
    expect(accountUpdate?.data).toEqual(
      expect.objectContaining({
        status: 'SUSPENDED',
        suspensionReason: 'Repeated platform abuse',
      }),
    );
    const accountAudit = tx.adminAuditLog.create.mock.calls[0]?.[0];
    expect(accountAudit?.data).toEqual(
      expect.objectContaining({
        actorUserId: ACTOR_ID,
        action: 'ACCOUNT_SUSPENDED',
        targetId: USER_ID,
      }),
    );
    expect(sessions.deleteAllUserSessions).toHaveBeenCalledWith(USER_ID);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.status).toBe('SUSPENDED');
  });

  it('prevents an administrator from suspending their own account', async () => {
    await expect(
      service.updateAccountStatus(ACTOR_ID, ACTOR_ID, {
        status: 'SUSPENDED',
        reason: 'This should never be allowed',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('prevents moderation of another super-admin account', async () => {
    database.user.findUnique.mockResolvedValue({
      id: USER_ID,
      accountType: 'SUPER_ADMIN',
      status: 'ACTIVE',
    });
    await expect(
      service.updateAccountStatus(ACTOR_ID, USER_ID, {
        status: 'SUSPENDED',
        reason: 'Attempting to remove another administrator',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('suspends a project without changing repository ownership', async () => {
    database.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      status: 'PUBLISHED',
      moderatedAt: null,
      moderatedByUserId: null,
    });
    tx.project.update.mockResolvedValue(projectRecord());

    const result = await service.moderateProject(ACTOR_ID, PROJECT_ID, {
      action: 'SUSPEND',
      reason: 'Unsafe content was published',
    });

    const suspensionUpdate = tx.project.update.mock.calls[0]?.[0];
    expect(suspensionUpdate?.where).toEqual({ id: PROJECT_ID });
    expect(suspensionUpdate?.data).toEqual(
      expect.objectContaining({
        status: 'SUSPENDED',
        moderatedByUserId: ACTOR_ID,
      }),
    );
    expect(suspensionUpdate?.data).not.toHaveProperty('createdByUserId');
    expect(suspensionUpdate?.data).not.toHaveProperty('repositoryId');
    expect(result.status).toBe('SUSPENDED');
  });

  it('restores only an admin-moderated project and returns it as a draft', async () => {
    database.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      status: 'SUSPENDED',
      moderatedAt: NOW,
      moderatedByUserId: ACTOR_ID,
    });
    tx.project.update.mockResolvedValue(
      projectRecord({
        status: 'DRAFT',
        moderatedAt: null,
        moderatedByUserId: null,
        moderationReason: null,
      }),
    );

    const result = await service.moderateProject(ACTOR_ID, PROJECT_ID, {
      action: 'RESTORE',
      reason: 'The moderation concern has been resolved',
    });

    const restoreUpdate = tx.project.update.mock.calls[0]?.[0];
    expect(restoreUpdate?.data).toEqual(
      expect.objectContaining({ status: 'DRAFT', publishedAt: null }),
    );
    expect(result.status).toBe('DRAFT');
  });

  it('does not restore a project archived by its owner', async () => {
    database.project.findUnique.mockResolvedValue({
      id: PROJECT_ID,
      status: 'ARCHIVED',
      moderatedAt: null,
      moderatedByUserId: null,
    });

    await expect(
      service.moderateProject(ACTOR_ID, PROJECT_ID, {
        action: 'RESTORE',
        reason: 'This project was not archived by moderation',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
