import { ForbiddenException } from '@nestjs/common';
import { AccountType, ProjectRoleKey, type User } from '@repo/db';
import type { DatabaseService } from '../database/prisma.service';
import { ProjectAccessService } from './project-access.service';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const OWNER_ID = '00000000-0000-4000-8000-000000000002';
const MEMBER_ID = '00000000-0000-4000-8000-000000000003';

describe('ProjectAccessService', () => {
  const findUnique = jest.fn();
  const service = new ProjectAccessService({
    project: { findUnique },
  } as unknown as DatabaseService);

  beforeEach(() => jest.clearAllMocks());

  it('grants the verified creator all owner capabilities', async () => {
    findUnique.mockResolvedValue(project(OWNER_ID, []));

    await expect(
      service.getAccess(user(OWNER_ID), PROJECT_ID),
    ).resolves.toMatchObject({
      currentUserRole: 'OWNER',
      capabilities: {
        canView: true,
        canEditContent: true,
        canPublish: true,
        canManageInvitations: true,
        canDelete: true,
      },
    });
  });

  it('grants editors content editing but no owner-only capabilities', async () => {
    findUnique.mockResolvedValue(
      project(OWNER_ID, [{ userId: MEMBER_ID, role: ProjectRoleKey.EDITOR }]),
    );

    await expect(
      service.getAccess(user(MEMBER_ID), PROJECT_ID),
    ).resolves.toMatchObject({
      currentUserRole: 'EDITOR',
      capabilities: {
        canView: true,
        canEditContent: true,
        canPublish: false,
        canManageInvitations: false,
        canDelete: false,
      },
    });
  });

  it('keeps contributors read-only', async () => {
    findUnique.mockResolvedValue(
      project(OWNER_ID, [
        { userId: MEMBER_ID, role: ProjectRoleKey.CONTRIBUTOR },
      ]),
    );

    const access = await service.getAccess(user(MEMBER_ID), PROJECT_ID);
    expect(access.capabilities.canView).toBe(true);
    expect(access.capabilities.canEditContent).toBe(false);
    await expect(
      service.assertCanEditContent(user(MEMBER_ID), PROJECT_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('grants no access when no verified membership was loaded', async () => {
    findUnique.mockResolvedValue(project(OWNER_ID, []));

    await expect(
      service.assertCanView(user(MEMBER_ID), PROJECT_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not let a super admin publish through the repository owner identity', async () => {
    findUnique.mockResolvedValue(project(OWNER_ID, []));

    const access = await service.getAccess(
      user(MEMBER_ID, AccountType.SUPER_ADMIN),
      PROJECT_ID,
    );
    expect(access.capabilities.canView).toBe(true);
    expect(access.capabilities.canEditContent).toBe(true);
    expect(access.capabilities.canPublish).toBe(false);
    expect(access.capabilities.canManageInvitations).toBe(false);
  });
});

function project(
  createdByUserId: string,
  members: Array<{ userId: string; role: ProjectRoleKey }>,
) {
  return { id: PROJECT_ID, createdByUserId, members };
}

function user(
  id: string,
  accountType: AccountType = AccountType.DEVELOPER,
): User {
  return { id, accountType } as User;
}
